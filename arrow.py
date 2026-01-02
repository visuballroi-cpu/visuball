import pygame
import math
from constants import ARROW_RUN, ARROW_PASS, ARROW_WIDTH, SCREEN_WIDTH, SCREEN_HEIGHT
from projection import projector

class DrillArrow:
    def __init__(self, start_pos, arrow_type='run'):
        # start_pos is screen pixels from the mouse
        wx, wy = projector.from_screen(*start_pos)
        self.points = [pygame.Vector2(wx, wy)] 
        self.type = arrow_type
        self.width = ARROW_WIDTH
        self.color = ARROW_PASS if self.type == 'pass' else ARROW_RUN

    def add_point(self, pos):
        wx, wy = projector.from_screen(*pos)
        new_pos = pygame.Vector2(wx, wy)
        if len(self.points) > 0:
            if self.points[-1].distance_to(new_pos) > 0.005: 
                 self.points.append(new_pos)
        else:
            self.points.append(new_pos)

    def draw(self, surface):
        if len(self.points) < 2: return

        # Project points to screen
        screen_pts = [projector.to_screen(p.x, p.y) for p in self.points]

        if self.type == 'pass':
            pygame.draw.lines(surface, self.color, False, screen_pts, self.width)
        else:
            # Better dashed line for 'run'
            # We draw small segments with gaps
            dash_len = 10
            gap_len = 8
            
            for i in range(len(screen_pts) - 1):
                p1 = pygame.Vector2(screen_pts[i])
                p2 = pygame.Vector2(screen_pts[i+1])
                diff = p2 - p1
                dist = diff.length()
                if dist == 0: continue
                
                # If segment is too long (unlikely with MOUSEMOTION), we could dash it
                # but with dense points from mouse, we can just skip segments
                if (i // 2) % 2 == 0:
                    pygame.draw.line(surface, self.color, p1, p2, self.width)

        # Arrow Head
        p_last = pygame.Vector2(screen_pts[-1])
        p_prev = pygame.Vector2(screen_pts[-2])
        diff = p_last - p_prev
        angle = math.atan2(diff.y, diff.x)
        arrow_len = 14
        arrow_angle = 0.5 

        pts = [
            p_last,
            (p_last.x - arrow_len * math.cos(angle - arrow_angle), p_last.y - arrow_len * math.sin(angle - arrow_angle)),
            (p_last.x - arrow_len * math.cos(angle + arrow_angle), p_last.y - arrow_len * math.sin(angle + arrow_angle))
        ]
        pygame.draw.polygon(surface, self.color, pts)

    def collidepoint(self, pos):
        if len(self.points) < 2: return False
        screen_pts = [projector.to_screen(p.x, p.y) for p in self.points]
        p = pygame.Vector2(pos)
        for i in range(len(screen_pts)-1):
            p1 = pygame.Vector2(screen_pts[i])
            p2 = pygame.Vector2(screen_pts[i+1])
            line_vec = p2 - p1
            l2 = line_vec.length_squared()
            if l2 == 0: continue
            t = max(0, min(1, (p - p1).dot(line_vec) / l2))
            projection = p1 + t * line_vec
            if p.distance_to(projection) < 25: # Increased threshold for easier deletion
                return True
        return False
