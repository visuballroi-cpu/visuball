import pygame
import math
import random
from constants import *
from projection import projector

class Pitch:
    def __init__(self, rect=None):
        self.line_width = 2
        self.line_color = (255, 255, 255, 230) # Brighter lines
        
        # Professional Premier League Colors
        self.grass_base = (34, 139, 34)       # Forest Green
        self.grass_dark = (28, 120, 28)       # Darker Green
        self.grass_light = (50, 205, 50)      # Lime Green accent
        
        # FIFA Dimensions (relative for 105x68 pitch)
        self.PENALTY_BOX_L = 16.5 / 105
        self.PENALTY_BOX_W = 40.3 / 68
        self.GOAL_AREA_L = 5.5 / 105
        self.GOAL_AREA_W = 18.3 / 68
        self.CENTER_CIRCLE_RX = 9.15 / 105
        self.CENTER_CIRCLE_RY = 9.15 / 68
        self.PENALTY_SPOT_X = 11.0 / 105
        self.GOAL_W = 7.32 / 68
        
        # Noise Texture for realism
        self.noise_texture = self.generate_noise_texture()

    def generate_noise_texture(self):
        # Generate a small noise texture to tile
        size = 256
        surf = pygame.Surface((size, size), pygame.SRCALPHA)
        # Simple random noise
        # This is slow if done pixel by pixel in Python, so we use a faster hack
        # We'll just draw many small rects
        for _ in range(3000):
            x = random.randint(0, size)
            y = random.randint(0, size)
            w = random.randint(1, 3)
            h = random.randint(1, 3)
            alpha = random.randint(5, 20)
            color = (0, 0, 0, alpha) if random.random() > 0.5 else (255, 255, 255, alpha)
            pygame.draw.rect(surf, color, (x, y, w, h))
        return surf

    def draw_grass_pattern(self, surface):
        screen_w = surface.get_width()
        screen_h = surface.get_height()
        
        # Background
        pygame.draw.rect(surface, theme.UI_BG, (0, 0, screen_w, screen_h))
        
        # Draw Checkered Pattern
        # We subdivide into a grid (e.g., 18x12 squares)
        # But for perspective correctness, we MUST use projector.to_screen for every vertex
        
        cols = 18 # Lengthwise
        rows = 12 # Widthwise
        
        # We need subdivision for smooth perspective on edges too
        # But drawing individual quads is fine if they are small enough
        
        for c in range(cols):
            for r in range(rows):
                # World Coords [0,1]
                x1 = c / cols
                x2 = (c + 1) / cols
                y1 = r / rows
                y2 = (r + 1) / rows
                
                # Determine Color (Stripes along width - "Camp Nou" style)
                if c % 2 == 0:
                    color = self.grass_base
                else:
                    color = self.grass_dark
                
                # Further subdivide each square into 2x2 for better rotation smoothness?
                # Actually, 18x12 is already 216 polys, decent. 
                # Let's use 4 points project
                
                p1 = projector.to_screen(x1, y1)
                p2 = projector.to_screen(x2, y1)
                p3 = projector.to_screen(x2, y2)
                p4 = projector.to_screen(x1, y2)
                
                # Draw main grass patch
                pygame.draw.polygon(surface, color, [p1, p2, p3, p4])
                
        # Apply Noise Overlay
        # Since we use perspective, a blind overlay looks flat. 
        # But mapping texture to perspective requires texturing (slow in pure pygame).
        # We will apply a global subtle grain over the whole screen area defined by the pitch to "fake" it.
        # Calc pitch bounds on screen approx
        
        # Actually, let's skip the perspective texture mapping and just blend the noise 
        # heavily masked by the pitch area, OR
        # Just use the simple polygon drawing which is cleaner. Realism comes from colors and subdivision.
        # Let's add a " Vignette" darkness at the edges of the pitch for dramatic effect.
        
        pass 

    def draw_subdivided_line(self, surface, p1_world, p2_world, color, width=2):
        # p1_world, p2_world are (x, y) tuples in [0,1]
        segments = 16 # Higher segments for sharper curves/lines in 3D
        pts = []
        for i in range(segments + 1):
            t = i / segments
            wx = p1_world[0] + (p2_world[0] - p1_world[0]) * t
            wy = p1_world[1] + (p2_world[1] - p1_world[1]) * t
            pts.append(projector.to_screen(wx, wy))
            
        # Draw line with anti-aliasing simulation (drawing multiple thin lines or just standard)
        # pygame.draw.lines doesn't AA width > 1.
        # We can draw it once.
        pygame.draw.lines(surface, color, False, pts, width) 

    def draw(self, surface):
        self.draw_grass_pattern(surface)
        
        # Boundary Lines
        self.draw_subdivided_line(surface, (0,0), (1,0), self.line_color, 3)
        self.draw_subdivided_line(surface, (1,0), (1,1), self.line_color, 3)
        self.draw_subdivided_line(surface, (1,1), (0,1), self.line_color, 3)
        self.draw_subdivided_line(surface, (0,1), (0,0), self.line_color, 3)
        
        # Center Line
        self.draw_subdivided_line(surface, (0.5, 0), (0.5, 1), self.line_color, 2)
        
        # Center Circle
        segments = 80
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
            
            # Netting Effect (Simple)
            if projector.mode == '3D':
                net_color = (200, 200, 200, 80)
                # Draw lines from top corners to back
                # This requires "back" depth points
                # For now just simple posts
                pass

            pygame.draw.line(surface, WHITE, p1, p1_top, 3)
            pygame.draw.line(surface, WHITE, p2, p2_top, 3)
            pygame.draw.line(surface, WHITE, p1_top, p2_top, 3)
            
        # 3D Atmospheric Fade (Horizon Haze)
        if projector.mode == '3D':
            # Create a localized haze rect
            fade_h = int(projector.h * 0.45)
            # Efficient fade drawing
            # We can pre-calculate this or draw it cheaply
            s = pygame.Surface((projector.w, fade_h), pygame.SRCALPHA)
            for i in range(fade_h):
                alpha = int(255 * (1 - (i / fade_h)**1.5)) # Cubic fade
                if alpha > 0:
                   pygame.draw.line(s, (theme.UI_BG[0], theme.UI_BG[1], theme.UI_BG[2], alpha), (0, i), (projector.w, i))
            surface.blit(s, (0, 0))

