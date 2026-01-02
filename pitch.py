import pygame
import math
from constants import *
from projection import projector

class Pitch:
    def __init__(self, rect=None):
        self.line_width = 2
        self.line_color = (255, 255, 255, 220)
        self.grass_base = (30, 80, 50)
        self.grass_stripe = (35, 95, 60)
        
        # FIFA Dimensions (relative for 105x68 pitch)
        self.PENALTY_BOX_L = 16.5 / 105
        self.PENALTY_BOX_W = 40.3 / 68
        self.GOAL_AREA_L = 5.5 / 105
        self.GOAL_AREA_W = 18.3 / 68
        self.CENTER_CIRCLE_RX = 9.15 / 105
        self.CENTER_CIRCLE_RY = 9.15 / 68
        self.PENALTY_SPOT_X = 11.0 / 105
        self.GOAL_W = 7.32 / 68

    def draw_grass_pattern(self, surface):
        pygame.draw.rect(surface, theme.UI_BG, (0, 0, projector.w, projector.h))
        
        # We subdivide the pitch into strips and DRAW each strip with multiple segments
        # to ensure perspective looks correct even with rotation.
        stripes_count = 10
        segments_per_line = 8 # Subdivide each edge for better perspective
        
        for i in range(stripes_count):
            y1 = i / stripes_count
            y2 = (i + 1) / stripes_count
            
            color = self.grass_stripe if i % 2 == 0 else self.grass_base
            
            # Create a polygon for this stripe, subdivided
            top_edge = []
            bottom_edge = []
            
            for s in range(segments_per_line + 1):
                x = s / segments_per_line
                top_edge.append(projector.to_screen(x, y1))
                bottom_edge.append(projector.to_screen(x, y2))
            
            # Combine to form a closed polygon: top edge then reversed bottom edge
            poly_pts = top_edge + bottom_edge[::-1]
            pygame.draw.polygon(surface, color, poly_pts)
            
        if projector.mode == '3D':
            # Subtle horizon haze
            fade_rect = pygame.Rect(0, 0, projector.w, int(projector.h * 0.4))
            fade_surf = pygame.Surface((projector.w, fade_rect.h), pygame.SRCALPHA)
            for y in range(fade_rect.h):
                alpha = int(180 * (1 - y/fade_rect.h))
                pygame.draw.line(fade_surf, (10, 15, 26, alpha), (0, y), (projector.w, y))
            surface.blit(fade_surf, (0, 0))

    def draw_subdivided_line(self, surface, p1_world, p2_world, color, width=2):
        # p1_world, p2_world are (x, y) tuples in [0,1]
        segments = 10
        pts = []
        for i in range(segments + 1):
            t = i / segments
            wx = p1_world[0] + (p2_world[0] - p1_world[0]) * t
            wy = p1_world[1] + (p2_world[1] - p1_world[1]) * t
            pts.append(projector.to_screen(wx, wy))
        pygame.draw.lines(surface, color, False, pts, width)

    def draw(self, surface):
        self.draw_grass_pattern(surface)
        
        # Boundary Lines (Subdivided for perspective)
        self.draw_subdivided_line(surface, (0,0), (1,0), self.line_color, 3)
        self.draw_subdivided_line(surface, (1,0), (1,1), self.line_color, 3)
        self.draw_subdivided_line(surface, (1,1), (0,1), self.line_color, 3)
        self.draw_subdivided_line(surface, (0,1), (0,0), self.line_color, 3)
        
        # Center Line
        self.draw_subdivided_line(surface, (0.5, 0), (0.5, 1), self.line_color, 2)
        
        # Center Circle
        segments = 64
        circle_pts = []
        for i in range(segments + 1):
            angle = (i / segments) * 2 * math.pi
            px = 0.5 + math.cos(angle) * self.CENTER_CIRCLE_RX
            py = 0.5 + math.sin(angle) * self.CENTER_CIRCLE_RY
            circle_pts.append(projector.to_screen(px, py))
        pygame.draw.lines(surface, self.line_color, False, circle_pts, 2)
        pygame.draw.circle(surface, self.line_color, projector.to_screen(0.5, 0.5), 4)
        
        # Boxes and Goals
        for side in [0, 1]:
            x_base = 0 if side == 0 else 1
            dir = 1 if side == 0 else -1
            
            # Penalty Box
            y_top = 0.5 - self.PENALTY_BOX_W / 2
            y_bot = 0.5 + self.PENALTY_BOX_W / 2
            lx = x_base + dir * self.PENALTY_BOX_L
            
            self.draw_subdivided_line(surface, (x_base, y_top), (lx, y_top), self.line_color, 2)
            self.draw_subdivided_line(surface, (lx, y_top), (lx, y_bot), self.line_color, 2)
            self.draw_subdivided_line(surface, (lx, y_bot), (x_base, y_bot), self.line_color, 2)
            
            # Goal Area
            y_g_top = 0.5 - self.GOAL_AREA_W / 2
            y_g_bot = 0.5 + self.GOAL_AREA_W / 2
            gx = x_base + dir * self.GOAL_AREA_L
            self.draw_subdivided_line(surface, (x_base, y_g_top), (gx, y_g_top), self.line_color, 2)
            self.draw_subdivided_line(surface, (gx, y_g_top), (gx, y_g_bot), self.line_color, 2)
            self.draw_subdivided_line(surface, (gx, y_g_bot), (x_base, y_g_bot), self.line_color, 2)
            
            # Penalty Spot
            spot_x = x_base + dir * self.PENALTY_SPOT_X
            pygame.draw.circle(surface, self.line_color, projector.to_screen(spot_x, 0.5), 3)

            # Penalty Arc (D-box)
            arc_pts = []
            for i in range(-50, 51):
                angle = math.radians(i)
                px = spot_x + math.cos(angle) * self.CENTER_CIRCLE_RX * dir
                py = 0.5 + math.sin(angle) * self.CENTER_CIRCLE_RY
                if (side == 0 and px > self.PENALTY_BOX_L) or (side == 1 and px < 1 - self.PENALTY_BOX_L):
                    arc_pts.append(projector.to_screen(px, py))
            if len(arc_pts) > 1:
                pygame.draw.lines(surface, self.line_color, False, arc_pts, 2)

            # Goals
            y_1 = 0.5 - self.GOAL_W / 2
            y_2 = 0.5 + self.GOAL_W / 2
            goal_h = 0.08
            
            p1 = projector.to_screen(x_base, y_1)
            p2 = projector.to_screen(x_base, y_2)
            p1_top = projector.to_screen(x_base, y_1, goal_h)
            p2_top = projector.to_screen(x_base, y_2, goal_h)
            
            pygame.draw.line(surface, WHITE, p1, p1_top, 3)
            pygame.draw.line(surface, WHITE, p2, p2_top, 3)
            pygame.draw.line(surface, WHITE, p1_top, p2_top, 3)
