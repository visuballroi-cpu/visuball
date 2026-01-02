import pygame
import math
from constants import *
from projection import projector

class DrillObject:
    def __init__(self, obj_id, x, y, color, stroke_color, label="", obj_type="player"):
        self.id = obj_id
        if x > 1 or y > 1:
            self.world_pos = pygame.Vector2(x / SCREEN_WIDTH, y / SCREEN_HEIGHT)
        else:
            self.world_pos = pygame.Vector2(x, y)
            
        self.pos = self.world_pos.copy() 
        self.start_pos = self.world_pos.copy() 
        self.color = color
        self.stroke_color = stroke_color
        self.radius = 18 
        self.label = label
        self.type = obj_type 
        
        self.is_dragging = False
        self.is_hovered = False
        
        self.font = pygame.font.SysFont("segoeui", 16, bold=True)
        self.render_label()

    def render_label(self):
        if self.label:
            self.text_surf = self.font.render(self.label, True, (255, 255, 255))
        else:
            self.text_surf = None

    def reset_position(self):
        self.pos = self.start_pos.copy()

    def draw(self, surface, alpha=255):
        sx, sy = projector.to_screen(self.pos.x, self.pos.y)
        dist_scale = 0.6 + self.pos.y * 0.4 if projector.mode == '3D' else 1.0
        current_radius = int(self.radius * dist_scale)
        
        body_color = list(self.color)
        if alpha < 255: body_color = [(c * alpha) // 255 for c in body_color]
        
        stroke_c = theme.ACCENT if (self.is_dragging or self.is_hovered) and alpha==255 else self.stroke_color
        thickness = 3 if self.is_dragging or self.is_hovered else 2

        if self.type == 'player':
            shadow_rect = pygame.Rect(sx - current_radius, sy - 2, current_radius * 2, current_radius // 2 + 2)
            pygame.draw.ellipse(surface, (0, 0, 0, 100), shadow_rect)
            
            height = int(35 * dist_scale)
            body_rect = pygame.Rect(sx - current_radius, sy - height, current_radius * 2, height)
            
            pygame.draw.ellipse(surface, body_color, (body_rect.x, body_rect.bottom - current_radius, body_rect.w, current_radius))
            pygame.draw.rect(surface, body_color, (body_rect.x, body_rect.y + current_radius//2, body_rect.w, height - current_radius))
            pygame.draw.ellipse(surface, body_color, (body_rect.x, body_rect.y, body_rect.w, current_radius))
            
            if thickness > 0:
                pygame.draw.rect(surface, stroke_c, body_rect, thickness, border_radius=current_radius)
            
            gloss_rect = pygame.Rect(sx - current_radius//2, body_rect.y + 4, current_radius, current_radius//3)
            pygame.draw.ellipse(surface, (255, 255, 255, 80), gloss_rect)

            if self.text_surf:
                label_y = body_rect.centery
                text_rect = self.text_surf.get_rect(center=(sx, label_y))
                surface.blit(self.text_surf, text_rect)
                
        elif self.type == 'ball':
            r = current_radius // 2
            # Ball Shadow (Soft)
            shadow_surf = pygame.Surface((r*3, r*1.5), pygame.SRCALPHA)
            pygame.draw.ellipse(shadow_surf, (0, 0, 0, 80), (0, 0, r*2.5, r*1.2))
            surface.blit(shadow_surf, (sx - r, sy + r//3))
            
            # Ball Body (Base White)
            pygame.draw.circle(surface, (255, 255, 255), (sx, sy), r)
            
            # Soccer Pattern (Better patch layout)
            # Center Pent
            pts = []
            for i in range(5):
                angle = math.radians(i * 72 - 18)
                pts.append((sx + r * 0.35 * math.cos(angle), sy + r * 0.35 * math.sin(angle)))
            pygame.draw.polygon(surface, (20, 20, 20), pts)
            
            # Side hexagonal lines
            for i in range(5):
                angle = math.radians(i * 72 - 18)
                p1 = (sx + r * 0.35 * math.cos(angle), sy + r * 0.35 * math.sin(angle))
                # Outer edge points
                p2 = (sx + r * 0.7 * math.cos(angle - 0.3), sy + r * 0.7 * math.sin(angle - 0.3))
                p3 = (sx + r * 0.7 * math.cos(angle + 0.3), sy + r * 0.7 * math.sin(angle + 0.3))
                pygame.draw.line(surface, (40, 40, 40), p1, p2, 1)
                pygame.draw.line(surface, (40, 40, 40), p1, p3, 1)
                
                # Dark patches at edges
                edge_pts = [p2, p3, (sx + r * math.cos(angle), sy + r * math.sin(angle))]
                pygame.draw.polygon(surface, (25, 25, 25), edge_pts)

            # Circular Outline for smoothness
            pygame.draw.circle(surface, (50, 50, 50), (sx, sy), r, 1)

            # Spherical Gradient Overlay (Shading)
            # We simulate a light source from top-left
            for i in range(r, 0, -1):
                alpha = int(40 * (1 - i/r))
                overlay = pygame.Surface((r*2, r*2), pygame.SRCALPHA)
                pygame.draw.circle(overlay, (0, 0, 0, alpha), (r, r), i)
                surface.blit(overlay, (sx - r, sy - r))
            
            # Highlight spot
            highlight_r = max(2, r // 3)
            highlight_surf = pygame.Surface((highlight_r*2, highlight_r*2), pygame.SRCALPHA)
            pygame.draw.circle(highlight_surf, (255, 255, 255, 120), (highlight_r, highlight_r), highlight_r)
            surface.blit(highlight_surf, (sx - r//2, sy - r//2))

            if self.is_hovered or self.is_dragging:
                pygame.draw.circle(surface, theme.ACCENT, (sx, sy), r + 2, 2)

        elif self.type == 'cone':
            pygame.draw.circle(surface, (0, 0, 0, 80), (sx, sy), current_radius)
            pts = [(sx - current_radius, sy), (sx + current_radius, sy), (sx, sy - current_radius * 1.5)]
            pygame.draw.polygon(surface, self.color, pts)
            pygame.draw.polygon(surface, stroke_c, pts, thickness)

    def handle_event(self, event):
        sx, sy = projector.to_screen(self.pos.x, self.pos.y)
        dist_scale = 0.6 + self.pos.y * 0.4 if projector.mode == '3D' else 1.0
        current_radius = int(self.radius * dist_scale)
        
        # Collision detection based on type
        is_hit = False
        if hasattr(event, 'pos'):
            if self.type == 'player':
                height = int(35 * dist_scale)
                hit_rect = pygame.Rect(sx - current_radius, sy - height, current_radius * 2, height)
                is_hit = hit_rect.collidepoint(event.pos)
            else: # Ball or Cone
                # Circular hit detection for ball/cone base
                mouse_pos = pygame.Vector2(event.pos)
                dist = mouse_pos.distance_to((sx, sy))
                is_hit = dist <= current_radius

        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1 and is_hit:
                self.is_dragging = True
                return True
        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1: self.is_dragging = False
        elif event.type == pygame.MOUSEMOTION:
            self.is_hovered = is_hit
            if self.is_dragging:
                wx, wy = projector.from_screen(*event.pos)
                self.pos.x, self.pos.y = wx, wy
                return True
        return False

class TextObject:
    def __init__(self, obj_id, x, y, text, color=WHITE, font_size=20):
        self.id = obj_id
        if x > 1 or y > 1:
            self.pos = pygame.Vector2(x / SCREEN_WIDTH, y / SCREEN_HEIGHT)
        else:
            self.pos = pygame.Vector2(x, y)
            
        self.text = text
        self.color = color
        self.font = pygame.font.SysFont("segoeui", font_size, bold=True)
        self.is_dragging = False
        self.is_hovered = False
        self.render_text()

    def render_text(self):
        self.text_surf = self.font.render(self.text, True, self.color)
        self.shadow_surf = self.font.render(self.text, True, (20, 20, 20))
        sx, sy = projector.to_screen(self.pos.x, self.pos.y)
        self.rect = self.text_surf.get_rect(center=(sx, sy))

    def draw(self, surface, alpha=255):
        self.render_text() 
        if alpha < 255:
            self.text_surf.set_alpha(alpha)
            self.shadow_surf.set_alpha(alpha)
            
        surface.blit(self.shadow_surf, self.rect.move(2, 2))
        surface.blit(self.text_surf, self.rect)
        
        if self.is_hovered:
            pygame.draw.rect(surface, theme.ACCENT, self.rect.inflate(10, 6), 1, border_radius=4)

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                self.is_dragging = True
                return True
        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1: self.is_dragging = False
        elif event.type == pygame.MOUSEMOTION:
            self.is_hovered = self.rect.collidepoint(event.pos)
            if self.is_dragging:
                wx, wy = projector.from_screen(*event.pos)
                self.pos.x, self.pos.y = wx, wy
                return True
        return False
