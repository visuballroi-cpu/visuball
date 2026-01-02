import pygame
import math
from constants import *

class Button:
    def __init__(self, x, y, w, h, text, callback, bg_color=None, text_color=None, icon_shape=None, font_size=16, radius=12):
        self.rect = pygame.Rect(x, y, w, h)
        self.text = text
        self.callback = callback
        self.base_bg = bg_color  
        self.base_text = text_color 
        self.font = pygame.font.SysFont("segoeui", font_size, bold=True)
        self.is_hovered = False
        self.radius = radius
        self.icon_shape = icon_shape 

    def draw(self, surface):
        # Resolve dynamic colors
        current_bg = self.base_bg if self.base_bg else theme.UI_PANEL
        current_text = self.base_text if self.base_text else theme.TEXT_MAIN
        
        # Determine actual color to use
        if self.is_hovered:
            draw_color = tuple(min(c + 20, 255) for c in current_bg)
            border_color = theme.ACCENT
        else:
            draw_color = current_bg
            border_color = theme.BORDER
            
        # Subtle Drop Shadow
        shadow_rect = self.rect.move(0, 2)
        pygame.draw.rect(surface, theme.SHADOW, shadow_rect, border_radius=self.radius)
        
        # Main Button
        pygame.draw.rect(surface, draw_color, self.rect, border_radius=self.radius)
        pygame.draw.rect(surface, border_color, self.rect, 1, border_radius=self.radius)
        
        center = self.rect.center
        if self.icon_shape == 'play':
            pts = [(center[0]-5, center[1]-8), (center[0]-5, center[1]+8), (center[0]+8, center[1])]
            pygame.draw.polygon(surface, current_text, pts)
        elif self.icon_shape == 'stop':
             pygame.draw.rect(surface, current_text, (center[0]-6, center[1]-6, 12, 12))
        elif self.icon_shape == 'plus':
             pygame.draw.line(surface, current_text, (center[0], center[1]-6), (center[0], center[1]+6), 3)
             pygame.draw.line(surface, current_text, (center[0]-6, center[1]), (center[0]+6, center[1]), 3)
        elif self.icon_shape == 'back':
             pygame.draw.line(surface, current_text, (center[0]+6, center[1]), (center[0]-6, center[1]), 3)
             pygame.draw.line(surface, current_text, (center[0]-6, center[1]), (center[0], center[1]-6), 3)
             pygame.draw.line(surface, current_text, (center[0]-6, center[1]), (center[0], center[1]+6), 3)
        elif self.icon_shape == 'chevron_left':
             pygame.draw.line(surface, current_text, (center[0]+4, center[1]-8), (center[0]-4, center[1]), 3)
             pygame.draw.line(surface, current_text, (center[0]-4, center[1]), (center[0]+4, center[1]+8), 3)
        elif self.icon_shape == 'chevron_right':
             pygame.draw.line(surface, current_text, (center[0]-4, center[1]-8), (center[0]+4, center[1]), 3)
             pygame.draw.line(surface, current_text, (center[0]+4, center[1]), (center[0]-4, center[1]+8), 3)
        elif self.icon_shape == 'undo':
            rect = pygame.Rect(0, 0, 16, 16)
            rect.center = center
            pygame.draw.arc(surface, current_text, rect, 0, 3.14, 2)
            pygame.draw.line(surface, current_text, (rect.left, rect.centery), (rect.left + 4, rect.centery - 4), 2)
            pygame.draw.line(surface, current_text, (rect.left, rect.centery), (rect.left + 4, rect.centery + 4), 2)
        elif self.icon_shape == 'sun':
            pygame.draw.circle(surface, current_text, center, 6)
            for i in range(8):
                angle = i * (math.pi / 4)
                start = (center[0] + math.cos(angle) * 8, center[1] + math.sin(angle) * 8)
                end = (center[0] + math.cos(angle) * 12, center[1] + math.sin(angle) * 12)
                pygame.draw.line(surface, current_text, start, end, 2)
        elif self.icon_shape == 'moon':
            pygame.draw.circle(surface, current_text, center, 8)
            # Clip part of the moon for crescent look 
            clip_pos = (center[0] + 4, center[1] - 2)
            pygame.draw.circle(surface, draw_color, clip_pos, 8)
        else:
            text_surf = self.font.render(self.text, True, current_text)
            text_rect = text_surf.get_rect(center=center)
            surface.blit(text_surf, text_rect)

    def handle_event(self, event):
        if event.type == pygame.MOUSEMOTION:
            self.is_hovered = self.rect.collidepoint(event.pos)
        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1 and self.rect.collidepoint(event.pos):
                if self.callback: self.callback()
                return True
        return False

class SessionCard:
    def __init__(self, x, y, w, h, session, callback):
        self.rect = pygame.Rect(x, y, w, h)
        self.session = session
        self.callback = callback
        self.is_hovered = False
        self.font_title = pygame.font.SysFont("segoeui", 22, bold=True)
        self.font_meta = pygame.font.SysFont("segoeui", 16)
        btn_text = "REVIEW" if session['status'] == 'COMPLETED' else "RUN ▶"
        btn_color = theme.ACCENT if session['status'] == 'COMPLETED' else (250, 200, 50)
        self.action_btn = Button(x + w - 120, y + 25, 100, 50, btn_text, self.trigger_callback, btn_color, (10,10,10))

    def trigger_callback(self):
        self.callback(self.session)

    def draw(self, surface):
        bg = theme.CHARCOAL_CARD
        if self.is_hovered:
            bg = tuple(min(c + 10, 255) for c in bg)
        
        # Shadow
        shadow_rect = self.rect.move(0, 4)
        pygame.draw.rect(surface, theme.SHADOW, shadow_rect, border_radius=15)
        
        # Main Card
        pygame.draw.rect(surface, bg, self.rect, border_radius=15)
        pygame.draw.rect(surface, theme.BORDER, self.rect, 1, border_radius=15)
        
        status_color = ACCENT_GREEN if self.session['status'] == 'COMPLETED' else ACCENT_YELLOW
        strip_rect = pygame.Rect(self.rect.left + 1, self.rect.top + 15, 4, self.rect.height - 30)
        pygame.draw.rect(surface, status_color, strip_rect, border_radius=2)
        
        text_x = self.rect.left + 30
        title_surf = self.font_title.render(self.session['title'], True, theme.TEXT_MAIN)
        surface.blit(title_surf, (text_x, self.rect.top + 20))
        
        meta_text = f"{self.session['date']} • {self.session['status']}"
        meta_surf = self.font_meta.render(meta_text.upper(), True, theme.TEXT_MUTED)
        surface.blit(meta_surf, (text_x, self.rect.top + 55))
        
        self.action_btn.draw(surface)

    def handle_event(self, event):
        if event.type == pygame.MOUSEMOTION:
            self.is_hovered = self.rect.collidepoint(event.pos)
            self.action_btn.handle_event(event)
        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.action_btn.handle_event(event): return True
            if event.button == 1 and self.rect.collidepoint(event.pos):
                self.callback(self.session)
                return True
        return False

class InputBox:
    def __init__(self, x, y, w, h, placeholder="", is_password=False):
        self.rect = pygame.Rect(x, y, w, h)
        self.text = ""
        self.placeholder = placeholder
        self.is_password = is_password
        self.font = pygame.font.SysFont("segoeui", 20)
        self.active = False
        self.cursor_pos = 0
        self.cursor_timer = 0
        self.refresh_text()

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.rect.collidepoint(event.pos):
                self.active = not self.active
            else:
                self.active = False
            if self.active: self.cursor_pos = len(self.text)
            self.refresh_text()
        if event.type == pygame.KEYDOWN and self.active:
            if event.key == pygame.K_RETURN: return "submit"
            elif event.key == pygame.K_BACKSPACE:
                if self.cursor_pos > 0:
                    self.text = self.text[:self.cursor_pos-1] + self.text[self.cursor_pos:]
                    self.cursor_pos -= 1
            elif event.key == pygame.K_DELETE:
                if self.cursor_pos < len(self.text):
                    self.text = self.text[:self.cursor_pos] + self.text[self.cursor_pos+1:]
            elif event.key == pygame.K_LEFT: self.cursor_pos = max(0, self.cursor_pos - 1)
            elif event.key == pygame.K_RIGHT: self.cursor_pos = min(len(self.text), self.cursor_pos + 1)
            elif event.unicode and event.unicode.isprintable():
                self.text = self.text[:self.cursor_pos] + event.unicode + self.text[self.cursor_pos:]
                self.cursor_pos += 1
            self.refresh_text()
        return None

    def refresh_text(self):
        display_text = "*" * len(self.text) if self.is_password else self.text
        if not self.text and not self.active: 
            self.display_text = self.placeholder
            self.color_text = theme.TEXT_HINT
        else: 
            self.display_text = display_text
            self.color_text = theme.TEXT_MAIN
            
    def set_text(self, text):
        self.text = text
        self.cursor_pos = len(text)
        self.refresh_text()

    def draw(self, screen):
        color_border = theme.ACCENT if self.active else theme.BORDER
        bg_color = theme.UI_PANEL if not self.active else theme.DEEP_CHARCOAL
        
        pygame.draw.rect(screen, bg_color, self.rect, border_radius=10)
        pygame.draw.rect(screen, color_border, self.rect, 2, border_radius=10)
        
        self.refresh_text()
        txt_surface = self.font.render(self.display_text, True, self.color_text)
        screen.blit(txt_surface, (self.rect.x + 12, self.rect.y + (self.rect.h - txt_surface.get_height())//2))
        
        if self.active:
            self.cursor_timer += 1
            if (self.cursor_timer // 20) % 2 == 0:
                display_before = "*" * self.cursor_pos if self.is_password else self.text[:self.cursor_pos]
                text_width, _ = self.font.size(display_before)
                cursor_x = self.rect.x + 12 + text_width
                pygame.draw.line(screen, theme.ACCENT, (cursor_x, self.rect.y + 10), (cursor_x, self.rect.y + self.rect.height - 10), 2)

class Sidebar:
    def __init__(self, active_item='dashboard', is_coach=True):
        self.max_w = 240
        self.min_w = 70
        self.current_w = self.max_w
        self.rect = pygame.Rect(0, 0, self.current_w, SCREEN_HEIGHT)
        self.active_item = active_item
        self.is_coach = is_coach
        self.font = pygame.font.SysFont("segoeui", 17, bold=True)
        self.font_logo = pygame.font.SysFont("segoeui", 22, bold=True)
        self.items = [('dashboard', 'Dashboard'), ('analytics', 'Performance'), ('notifications', 'Inbox')]
        if is_coach: self.items.insert(1, ('team', 'Team Management'))
        self.item_height = 55
        self.start_y = 140
        self.hover_idx = -1
        self.collapsed = False
        
        self.icon = None
        try:
            import os
            icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_icon.png")
            if os.path.exists(icon_path):
                img = pygame.image.load(icon_path).convert_alpha()
                self.icon = pygame.transform.smoothscale(img, (36, 36))
        except: pass

        self.btn_theme = Button(15, SCREEN_HEIGHT - 65, 40, 40, "", self.toggle_theme, radius=20)
        self.btn_collapse = Button(self.current_w - 45, 45, 30, 30, "", self.toggle_collapse, bg_color=theme.UI_PANEL, radius=15)

    def toggle_theme(self):
        new_mode = 'light' if theme.mode == 'dark' else 'dark'
        theme.set_mode(new_mode)

    def toggle_collapse(self):
        self.collapsed = not self.collapsed

    def update(self):
        target = self.min_w if self.collapsed else self.max_w
        self.current_w += (target - self.current_w) * 0.15
        self.rect.width = self.current_w
        self.btn_collapse.rect.x = self.current_w - 40
        self.btn_collapse.icon_shape = 'chevron_right' if self.collapsed else 'chevron_left'
        if abs(target - self.current_w) < 1: self.current_w = target

    def draw(self, surface):
        # Sidebar BG with slight gradient simulation
        pygame.draw.rect(surface, theme.DEEP_CHARCOAL, self.rect)
        pygame.draw.line(surface, theme.BORDER, (self.current_w-1, 0), (self.current_w-1, SCREEN_HEIGHT), 1)
        
        # Logo Logic
        if self.current_w > 140:
            if self.icon:
                surface.blit(self.icon, (25, 42))
                logo_x = 70
            else:
                logo_x = 30
            logo_surf = self.font_logo.render("FOOTBALL", True, theme.ACCENT)
            surface.blit(logo_surf, (logo_x, 40))
        elif self.icon:
            surface.blit(self.icon, (self.current_w // 2 - 18, 40))
            
        for i, (key, label) in enumerate(self.items):
            iy = self.start_y + i * self.item_height
            is_active = self.active_item == key
            is_hover = self.hover_idx == i
            
            item_rect = pygame.Rect(12, iy, self.current_w - 24, self.item_height - 6)
            
            if is_active:
                pygame.draw.rect(surface, theme.SIDEBAR_ACTIVE, item_rect, border_radius=10)
                pygame.draw.rect(surface, theme.ACCENT, item_rect, 1, border_radius=10)
                color = theme.TEXT_MAIN
            elif is_hover:
                pygame.draw.rect(surface, theme.UI_PANEL, item_rect, border_radius=10)
                color = theme.TEXT_MAIN
            else:
                color = theme.TEXT_MUTED
            
            if self.current_w > 160:
                txt_surf = self.font.render(label, True, color)
                surface.blit(txt_surf, (55, iy + (self.item_height - txt_surf.get_height())//2 - 3))
            else:
                char = label[0]
                char_surf = self.font.render(char, True, color)
                surface.blit(char_surf, (self.current_w // 2 - char_surf.get_width() // 2, iy + (self.item_height - char_surf.get_height())//2 - 3))
            
        self.btn_theme.icon_shape = 'sun' if theme.mode == 'dark' else 'moon'
        self.btn_theme.base_text = ACCENT_YELLOW if theme.mode == 'dark' else (50, 50, 100)
        self.btn_theme.rect.x = self.current_w // 2 - 20
        self.btn_theme.draw(surface)
        self.btn_collapse.draw(surface)

    def handle_event(self, event, manager):
        if self.btn_collapse.handle_event(event): return True
        if self.btn_theme.handle_event(event): return True
        
        if event.type == pygame.MOUSEMOTION:
            self.hover_idx = -1
            for i in range(len(self.items)):
                iy = self.start_y + i * self.item_height
                if pygame.Rect(0, iy, self.current_w, self.item_height).collidepoint(event.pos):
                    self.hover_idx = i
                    break
        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1 and self.hover_idx != -1:
                target = self.items[self.hover_idx][0]
                if target != self.active_item: manager.switch_scene(target)
                return True
        return False

class Dropdown:
    def __init__(self, x, y, w, h, options, callback, placeholder="Select..."):
        self.rect = pygame.Rect(x, y, w, h)
        self.options = options
        self.callback = callback
        self.placeholder = placeholder
        self.selected_idx = -1
        self.is_open = False
        self.font = pygame.font.SysFont("segoeui", 14, bold=True)
        self.hover_idx = -1
        self.max_display = 10
        self.scroll_idx = 0

    def draw(self, surface):
        bg = theme.UI_PANEL
        # Shadow
        shadow_rect = self.rect.move(0, 2)
        pygame.draw.rect(surface, theme.SHADOW, shadow_rect, border_radius=10)
        
        pygame.draw.rect(surface, bg, self.rect, border_radius=10)
        pygame.draw.rect(surface, theme.BORDER, self.rect, 1, border_radius=10)
        
        text = self.options[self.selected_idx] if self.selected_idx != -1 else self.placeholder
        txt_surf = self.font.render(text, True, theme.TEXT_MAIN)
        surface.blit(txt_surf, (self.rect.x + 15, self.rect.y + (self.rect.h - txt_surf.get_height())//2))
        
        arrow_char = "▲" if self.is_open else "▼"
        arrow_surf = self.font.render(arrow_char, True, theme.ACCENT)
        surface.blit(arrow_surf, (self.rect.right - 25, self.rect.y + (self.rect.h - arrow_surf.get_height())//2))

    def draw_list(self, surface):
        if self.is_open:
            item_h = 32
            num_show = min(len(self.options), self.max_display)
            dropdown_rect = pygame.Rect(self.rect.x, self.rect.bottom + 5, self.rect.w, num_show * item_h)
            
            # Dropdown Shadow
            pygame.draw.rect(surface, theme.SHADOW, dropdown_rect.move(0,4), border_radius=10)
            
            pygame.draw.rect(surface, theme.UI_PANEL, dropdown_rect, border_radius=10)
            pygame.draw.rect(surface, theme.BORDER, dropdown_rect, 1, border_radius=10)
            
            display_opts = self.options[self.scroll_idx:self.scroll_idx + self.max_display]
            for i, opt in enumerate(display_opts):
                iy = self.rect.bottom + 5 + i * item_h
                opt_rect = pygame.Rect(self.rect.x + 4, iy + 2, self.rect.w - 8, item_h - 4)
                
                real_idx = i + self.scroll_idx
                if self.hover_idx == real_idx:
                    pygame.draw.rect(surface, theme.SIDEBAR_ACTIVE, opt_rect, border_radius=6)
                
                o_surf = self.font.render(opt, True, theme.TEXT_MAIN)
                surface.blit(o_surf, (opt_rect.x + 12, opt_rect.y + (opt_rect.h - o_surf.get_height())//2))

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1:
                if self.rect.collidepoint(event.pos):
                    self.is_open = not self.is_open
                    return True
                
                if self.is_open:
                    item_h = 32
                    num_show = min(len(self.options), self.max_display)
                    for i in range(num_show):
                        iy = self.rect.bottom + 5 + i * item_h
                        if pygame.Rect(self.rect.x, iy, self.rect.w, item_h).collidepoint(event.pos):
                            self.selected_idx = i + self.scroll_idx
                            self.is_open = False
                            self.callback(self.options[self.selected_idx])
                            return True
                    self.is_open = False
            
            if self.is_open:
                if event.button == 4: # Scroll Up
                    self.scroll_idx = max(0, self.scroll_idx - 1)
                    return True
                if event.button == 5: # Scroll Down
                    self.scroll_idx = min(len(self.options) - self.max_display, self.scroll_idx + 1)
                    return True
                    
        if event.type == pygame.MOUSEMOTION and self.is_open:
            self.hover_idx = -1
            item_h = 32
            num_show = min(len(self.options), self.max_display)
            for i in range(num_show):
                iy = self.rect.bottom + 5 + i * item_h
                if pygame.Rect(self.rect.x, iy, self.rect.w, item_h).collidepoint(event.pos):
                    self.hover_idx = i + self.scroll_idx
                    break
        return False
class SidePanel:
    def __init__(self, title="TOOLS"):
        self.max_w = 260
        self.min_w = 40
        self.current_w = self.max_w
        self.collapsed = False
        self.rect = pygame.Rect(0, 0, self.current_w, SCREEN_HEIGHT)
        self.title = title
        self.font_title = pygame.font.SysFont("segoeui", 20, bold=True)
        self.btn_collapse = Button(self.current_w - 35, 20, 25, 25, "", self.toggle_collapse, bg_color=theme.UI_PANEL, radius=10)

    def toggle_collapse(self):
        self.collapsed = not self.collapsed

    def update(self):
        target = self.min_w if self.collapsed else self.max_w
        self.current_w += (target - self.current_w) * 0.15
        self.rect.width = int(self.current_w)
        self.btn_collapse.rect.x = int(self.current_w - (35 if not self.collapsed else 35))
        # Keep button visible in a reasonable spot
        if self.collapsed and self.current_w < self.min_w + 10:
             self.btn_collapse.rect.x = self.current_w // 2 - 12
        else:
             self.btn_collapse.rect.x = self.current_w - 35
             
        self.btn_collapse.icon_shape = 'chevron_right' if self.collapsed else 'chevron_left'
        if abs(target - self.current_w) < 1: self.current_w = target

    def draw(self, surface):
        pygame.draw.rect(surface, theme.DEEP_CHARCOAL, self.rect)
        pygame.draw.line(surface, theme.BORDER, (self.current_w-1, 0), (self.current_w-1, SCREEN_HEIGHT), 1)
        if self.current_w > 100:
            t_surf = self.font_title.render(self.title, True, theme.ACCENT)
            surface.blit(t_surf, (20, 22))
        self.btn_collapse.draw(surface)

    def handle_event(self, event):
        return self.btn_collapse.handle_event(event)
class Slider:
    def __init__(self, x, y, w, min_val, max_val, initial_val, label="", callback=None):
        self.rect = pygame.Rect(x, y, w, 20)
        self.min_val = min_val
        self.max_val = max_val
        self.val = initial_val
        self.label = label
        self.callback = callback
        self.dragging = False
        self.font = pygame.font.SysFont("segoeui", 14, bold=True)
        
        # Handle circle
        self.update_handle_pos()

    def update_handle_pos(self):
        ratio = (self.val - self.min_val) / (self.max_val - self.min_val)
        self.handle_x = self.rect.x + ratio * self.rect.w

    def draw(self, surface):
        # Label
        if self.label:
            l_surf = self.font.render(f"{self.label}: {int(self.val)}", True, theme.TEXT_MAIN)
            surface.blit(l_surf, (self.rect.x, self.rect.y - 25))
            
        # Track
        pygame.draw.rect(surface, theme.BORDER, (self.rect.x, self.rect.centery - 2, self.rect.w, 4), border_radius=2)
        # Active part
        active_w = self.handle_x - self.rect.x
        pygame.draw.rect(surface, theme.ACCENT, (self.rect.x, self.rect.centery - 2, active_w, 4), border_radius=2)
        
        # Handle
        color = theme.ACCENT if self.dragging else WHITE
        pygame.draw.circle(surface, color, (int(self.handle_x), self.rect.centery), 10)
        pygame.draw.circle(surface, theme.BORDER, (int(self.handle_x), self.rect.centery), 10, 1)

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            handle_rect = pygame.Rect(self.handle_x - 15, self.rect.y - 10, 30, 40)
            if handle_rect.collidepoint(event.pos) or self.rect.collidepoint(event.pos):
                self.dragging = True
                self.update_val(event.pos[0])
                return True
        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1: self.dragging = False
        elif event.type == pygame.MOUSEMOTION:
            if self.dragging:
                self.update_val(event.pos[0])
                return True
        return False

    def update_val(self, mouse_x):
        rel_x = max(0, min(mouse_x - self.rect.x, self.rect.w))
        ratio = rel_x / self.rect.w
        self.val = self.min_val + ratio * (self.max_val - self.min_val)
        self.handle_x = self.rect.x + rel_x
        if self.callback:
             self.callback(self.val)
