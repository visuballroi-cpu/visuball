import pygame
import sys
from constants import *
from pitch import Pitch
from drill_object import DrillObject, TextObject
from db import get_weekly_schedule
from arrow import DrillArrow
import random
import database
import datetime
import weather
from projection import projector
from formations import FORMATIONS, get_formation
from ui_components import Button, SessionCard, InputBox, Sidebar, Dropdown, SidePanel, Slider

# Move Editor logic to a separate class
class EditorScene:
    def __init__(self, manager, session_data=None):
        self.manager = manager
        self.session_data = session_data or {}
        self.session_id = self.session_data.get('id')
        self.session_title = self.session_data.get('title', "Custom Drill")
        
        self.pitch_rect = pygame.Rect(PITCH_MARGIN, PITCH_MARGIN, SCREEN_WIDTH - 2*PITCH_MARGIN, SCREEN_HEIGHT - 2*PITCH_MARGIN - UI_HEIGHT)
        self.pitch = Pitch(self.pitch_rect)
        self.players = []
        self.frames = [] # List of dicts {id: pos}
        self.arrows = []
        self.text_labels = []
        
        # UI for Metadata
        self.input_title = InputBox(240, 20, 200, 40, "Drill Title")
        self.input_title.set_text(self.session_title)
        
        self.input_note = InputBox(SCREEN_WIDTH - 420, 20, 300, 40, "Coach's Note...")
        self.session_note = self.session_data.get('note', "")
        self.input_note.set_text(self.session_note)
        
        self.input_time = InputBox(450, 20, 100, 40, "10:00")
        self.session_time = self.session_data.get('time', "10:00")
        self.input_time.set_text(self.session_time)
        
        # Load Data if exists
        self.load_session()
            
        # Animation State
        self.playing = self.session_data.get('autoplay', False) if len(self.frames) > 1 else False
        self.current_frame_idx = 0
        self.t = 0.0 
        self.PLAY_SPEED = 0.02

        # Drawing Tools State
        self.current_tool = 'cursor' # 'cursor', 'arrow_run', 'arrow_pass'
        self.active_arrow = None # Temporary arrow being drawn
        
        self.side_panel = SidePanel("EDITOR TOOLS")
        
        # UI
        ui_y = SCREEN_HEIGHT - 80
        self.buttons = [
            Button(SCREEN_WIDTH - 60, 20, 40, 40, "", self.go_back, None, theme.TEXT_MUTED, icon_shape='back'), # Back Button (Top Right)
            
            # Action controls remain at the bottom/center
            Button(SCREEN_WIDTH // 2 - 200, ui_y, 140, 50, "ADD STEP", self.save_frame, ACCENT_GREEN, WHITE),
            Button(SCREEN_WIDTH // 2 - 50, ui_y, 60, 50, "", self.play_toggle, ACCENT_YELLOW, WHITE, icon_shape='play'),
            Button(SCREEN_WIDTH // 2 + 20, ui_y, 60, 50, "", self.undo_last_step, None, WHITE, icon_shape='undo'),
            Button(SCREEN_WIDTH // 2 + 90, ui_y, 100, 50, "RESET", self.reset_drill, ACCENT_RED, WHITE),
            
            # Sidebar Tools
            Button(20, 100, 180, 40, "3D / 2D TOGGLE", self.toggle_projection, ELECTRIC_BLUE, BLACK),
            Button(20, 150, 100, 40, "CLEAR ALL", self.clear_all_players, ACCENT_RED, WHITE),
            
            # Palette Buttons (Small icons for sidebar)
            Button(20, 640, 100, 40, "RUN", lambda: self.set_tool('arrow_run'), ARROW_RUN, BLACK),
            Button(130, 640, 100, 40, "PASS", lambda: self.set_tool('arrow_pass'), ARROW_PASS, BLACK),
            
            Button(20, 690, 100, 40, "BALL", lambda: self.set_tool('ball'), WHITE, BLACK),
            Button(130, 690, 100, 40, "TEXT", lambda: self.set_tool('text'), EMERALD_GREEN, WHITE),
            
            Button(20, 740, 100, 40, "CURSOR", lambda: self.set_tool('cursor'), theme.TEXT_MAIN, theme.UI_PANEL),

            # Save Button
            Button(SCREEN_WIDTH - 120, ui_y, 100, 50, "SAVE", self.save_to_db, ACCENT_YELLOW, BLACK),
        ]

        # Right Side Panel (X = SCREEN_WIDTH - 170) -> Now in Left SidePanel
        f_options = list(FORMATIONS.keys())
        v_options = ["Full", "Left Half", "Right Half", "Center"]
        count_opts = [str(i) for i in range(1, 12)]

        self.drop_view = Dropdown(20, 260, 200, 40, v_options, self.change_pitch_view, "Pitch View")
        
        # Team A Controls
        self.drop_team_a = Dropdown(20, 330, 200, 40, f_options, lambda f: self.apply_formation(f, "A"), "Formation Team A")
        self.drop_add_a = Dropdown(20, 375, 200, 40, count_opts, lambda n: self.spawn_squad(int(n), "A"), "Add Squad A")
        
        # Team B Controls
        self.drop_team_b = Dropdown(20, 440, 200, 40, f_options, lambda f: self.apply_formation(f, "B"), "Formation Team B")
        self.drop_add_b = Dropdown(20, 485, 200, 40, count_opts, lambda n: self.spawn_squad(int(n), "B"), "Add Squad B")

        # Rotation Slider
        self.slider_rot = Slider(20, 580, 200, 0, 360, projector.angle, "PITCH ROTATION", self.update_pitch_rotation)
        
        self.title_font = pygame.font.SysFont("segoeui", 24, bold=True)
        self.subtitle_font = pygame.font.SysFont("segoeui", 18)
        
        self.icon = None
        try:
            raw_icon = pygame.image.load("app_icon.png").convert_alpha()
            self.icon = pygame.transform.smoothscale(raw_icon, (40, 40))
        except: pass

    def load_session(self):
        # 1. Load Players/Frames from JSON data
        raw_data = self.session_data.get('data', {})
        if raw_data:
            # Reconstruct players
            p_list = raw_data.get('players', [])
            for p in p_list:
                # p is dict: {id, x, y, type, color, stroke, label}
                # Handle possible missing keys safely if schema changed
                obj = DrillObject(p['id'], p['x'], p['y'], tuple(p['color']), tuple(p['stroke']), p['label'], p['type'])
                self.players.append(obj)
            
            # Reconstruct frames
            self.frames = raw_data.get('frames', [])
            
            # Reconstruct text labels
            t_list = raw_data.get('text_labels', [])
            for t in t_list:
                obj = TextObject(t['id'], t['x'], t['y'], t['text'], tuple(t['color']), t.get('size', 24))
                self.text_labels.append(obj)
            
            # Load Note & Time
            self.session_note = raw_data.get('note', "")
            self.input_note.set_text(self.session_note)
            self.session_time = self.session_data.get('time', "10:00")
            self.input_time.set_text(self.session_time)
            
        # 2. If no players, we don't add defaults anymore (user wants to add them manually)
        # But we keep this for legacy or if we want to force a start.
        # For now, let's keep it empty as requested.
        pass

    def apply_formation(self, formation_name, team):
        # Clear existing players of that team
        self.players = [p for p in self.players if not p.id.startswith(team)]
        
        coords = get_formation(formation_name, mirrored=(team == "B"))
        
        color = TEAM_A_COLOR if team == "A" else TEAM_B_COLOR
        stroke = TEAM_A_STROKE if team == "A" else TEAM_B_STROKE
        
        for i, pos in enumerate(coords):
            # Find next free number for label
            new_num = self.get_next_player_number()
            obj = DrillObject(f"{team}{new_num}", pos[0], pos[1], color, stroke, str(new_num), "player")
            self.players.append(obj)
        
        # Add ball if not present
        if not any(p.type == 'ball' for p in self.players):
            self.players.append(DrillObject("ball", 0.5, 0.5, BALL_COLOR, BALL_STROKE, "", "ball"))

        # Captured for animation
        self.save_frame()

    def get_next_player_number(self):
        existing = [int(p.label) for p in self.players if p.label.isdigit()]
        n = 1
        while n in existing: n += 1
        return n

    def update_pitch_rotation(self, val):
        projector.angle = val

    def change_pitch_view(self, view_name):
        projector.set_view(view_name)

    def spawn_squad(self, count, team):
        # Spawn N players in a line/grid near the center
        color = TEAM_A_COLOR if team == "A" else TEAM_B_COLOR
        stroke = TEAM_A_STROKE if team == "A" else TEAM_B_STROKE
        
        wx_base, wy_base = projector.from_screen(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
        
        for i in range(count):
            num = self.get_next_player_number()
            # Spacing offset
            wx = wx_base + (i % 4) * 0.05 - 0.1
            wy = wy_base + (i // 4) * 0.05 - 0.1
            p_id = f"{team}{num}"
            self.players.append(DrillObject(p_id, wx, wy, color, stroke, str(num), "player"))
        
        self.save_frame()

    def spawn_player(self, team):
        color = TEAM_A_COLOR if team == "A" else TEAM_B_COLOR
        stroke = TEAM_A_STROKE if team == "A" else TEAM_B_STROKE
        
        num = self.get_next_player_number()
        p_id = f"{team}{num}"
        label = str(num)
        
        # Spawn near side center based on current view if possible, or just default
        wx, wy = projector.from_screen(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
        self.players.append(DrillObject(p_id, wx, wy, color, stroke, label, "player"))
        # If this is the first item ever and no frames, capture start
        if len(self.frames) == 0:
            self.save_frame()

    def spawn_ball(self):
        self.players.append(DrillObject(f"ball_{random.randint(0,999)}", 0.5, 0.5, BALL_COLOR, BALL_STROKE, "", "ball"))

    def clear_all_players(self):
        self.players = []
        self.arrows = []
        self.text_labels = []
        self.frames = []
        self.save_frame()

    def toggle_projection(self):
        projector.mode = '2D' if projector.mode == '3D' else '3D'
        # Update button text
        for b in self.buttons:
            if "MODE" in b.text:
                b.text = "2D MODE" if projector.mode == '3D' else "3D MODE"
                break

    def save_to_db(self):
        # Serialize
        players_data = []
        for p in self.players:
            players_data.append({
                'id': p.id,
                'x': p.pos.x, # Save current pos as base
                'y': p.pos.y,
                'color': p.color,
                'stroke': p.stroke_color,
                'label': p.label,
                'type': p.type
            })
            
        data_dict = {
            'players': players_data,
            'frames': self.frames,
            'text_labels': [{'id': t.id, 'x': t.pos.x, 'y': t.pos.y, 'text': t.text, 'color': t.color} for t in self.text_labels],
            'note': self.input_note.text
        }
        
        user_id = self.manager.current_user['id']
        date_str = datetime.date.today().strftime("%Y-%m-%d")
        
        self.session_title = self.input_title.text if self.input_title.text else "Custom Drill"
        session_time = self.input_time.text if self.input_time.text else "10:00"
        
        if self.session_id and self.session_id != 999:
            # Update
            database.update_session(self.session_id, data_dict, self.session_title, session_time)
            print("Session Updated!")
        else:
            # Create
            database.create_session(user_id, self.session_title, self.session_data.get('date', date_str), session_time, "UPCOMING", data_dict)
            print(f"New Session Created for {self.session_data.get('date', date_str)} at {session_time}!")
        
        # Return to Dashboard
        self.manager.switch_scene("dashboard")

    def add_cone(self):
        # Random pos in center
        x = SCREEN_WIDTH // 2 + random.randint(-50, 50)
        y = SCREEN_HEIGHT // 2 + random.randint(-50, 50)
        cone = DrillObject(f"cone_{len(self.players)}", x, y, CONE_COLOR, BLACK, "", "cone")
        self.players.append(cone)

    def set_tool(self, tool_name):
        self.current_tool = tool_name
        self.active_arrow = None

    def go_back(self):
        self.manager.switch_scene("dashboard")

    def save_frame(self):
        frame_data = {p.id: (p.pos.x, p.pos.y) for p in self.players}
        self.frames.append(frame_data)

    def play_toggle(self):
        if len(self.frames) < 2: return
        self.playing = not self.playing
        if self.playing:
             if self.current_frame_idx >= len(self.frames) - 1:
                self.current_frame_idx = 0
                self.t = 0.0
                
    def reset_drill(self):
        self.frames.clear()
        self.playing = False
        self.t = 0.0
        self.current_frame_idx = 0
        
        # Hard Reset: Restore initial positions and remove added cones
        # 1. Remove non-player objects (assuming we want to clear Cones)
        self.players = [p for p in self.players if p.type in ['player', 'ball']]
        self.arrows.clear()
        self.text_labels.clear()
        self.active_arrow = None
        self.current_tool = 'cursor'
        
        # 2. Reset positions
        for p in self.players:
            p.reset_position()

    def undo_last_step(self):
        if len(self.frames) > 0:
            self.frames.pop()
            # Restore positions to the new last frame, or start_pos if empty
            if len(self.frames) > 0:
                last_frame = self.frames[-1]
                for p in self.players:
                    if p.id in last_frame:
                         p.pos = pygame.Vector2(last_frame[p.id])
            else:
                 # Revert to start
                 for p in self.players:
                     p.reset_position()
            
            # Reset animation state
            self.playing = False
            self.current_frame_idx = max(0, len(self.frames) - 1)
            self.t = 0.0

    def update(self):
        self.side_panel.update()
        projector.set_offset(self.side_panel.current_w)
        # Update Icon
        self.buttons[2].icon_shape = 'stop' if self.playing else 'play'
        
        if self.playing and len(self.frames) > 1:
            self.t += self.PLAY_SPEED
            if self.t >= 1.0:
                self.t = 0.0
                self.current_frame_idx += 1
                if self.current_frame_idx >= len(self.frames) - 1:
                    self.playing = False
                    self.current_frame_idx = len(self.frames) - 1
                    return

            start_frame = self.frames[self.current_frame_idx]
            end_frame = self.frames[self.current_frame_idx + 1]
            for p in self.players:
                if p.id in start_frame and p.id in end_frame:
                    start_pos = pygame.Vector2(start_frame[p.id])
                    end_pos = pygame.Vector2(end_frame[p.id])
                    
                    # Check for path (Arrow)
                    # Heuristic: Find an arrow that starts near start_pos and ends near end_pos (within margin)
                    assigned_path = None
                    for arrow in self.arrows:
                         # Use smaller threshold (percentage of pitch)
                         if arrow.type == 'run':
                             if arrow.start_pos.distance_to(start_pos) < 0.05 and arrow.end_pos.distance_to(end_pos) < 0.05:
                                 assigned_path = arrow
                                 break
                    
                    if assigned_path:
                        p.pos = assigned_path.get_position_at(self.t)
                    else:
                        p.pos = start_pos.lerp(end_pos, self.t)

    def draw(self, screen):
        screen.fill(theme.UI_BG)
        self.pitch.draw(screen)
        
        # Draw Arrows (Bottom Layer)
        for arrow in self.arrows:
            arrow.draw(screen)
            
        if self.active_arrow:
            self.active_arrow.draw(screen)
        
        # --- GHOSTING EFFECT ---
        # If we have frames saved, show the specific previous frame (or last frame if adding new)
        last_frame = None
        if len(self.frames) > 0:
            last_frame = self.frames[-1]
            
        if not self.playing and last_frame:
            for p in self.players:
                if p.id in last_frame:
                    # Save current pos
                    real_pos = p.pos.copy()
                    
                    # Move to ghost pos temporarily to use .draw()
                    p.pos = pygame.Vector2(last_frame[p.id])
                    p.draw(screen, alpha=70) # Ghost!
                    
                    # Restore real pos
                    p.pos = real_pos
        
        # Draw Real Players - SORT BY Y for proper overlap in 3D
        sorted_players = sorted(self.players, key=lambda x: x.pos.y)
        for p in sorted_players:
            p.draw(screen)
            
        # Draw Text Labels
        for t in self.text_labels:
            t.draw(screen)
            
        # --- GLASSUI BAR ---
        ui_rect = pygame.Rect(0, SCREEN_HEIGHT - UI_HEIGHT, SCREEN_WIDTH, UI_HEIGHT)
        
        # Theme-aware UI bar background
        ui_surf = pygame.Surface((ui_rect.width, ui_rect.height), pygame.SRCALPHA)
    def draw(self, screen):
        screen.fill(theme.UI_BG)
        self.pitch.draw(screen)
        
        # Objects (Drawn behind UI)
        for arrow in self.arrows: arrow.draw(screen)
        if self.active_arrow: self.active_arrow.draw(screen)
        for p in self.players: p.draw(screen)
        for t in self.text_labels: t.draw(screen)

        # Bottom bar background (HUD)
        ui_rect = pygame.Rect(0, SCREEN_HEIGHT - UI_HEIGHT, SCREEN_WIDTH, UI_HEIGHT)
        ui_surf = pygame.Surface((SCREEN_WIDTH, UI_HEIGHT), pygame.SRCALPHA)
        bg_col = theme.UI_PANEL
        ui_surf.fill((bg_col[0], bg_col[1], bg_col[2], 220)) 
        screen.blit(ui_surf, ui_rect)
        pygame.draw.line(screen, theme.BORDER, (0, ui_rect.top), (SCREEN_WIDTH, ui_rect.top), 1)

        # Metadata Inputs
        self.input_title.draw(screen)
        self.input_note.draw(screen)
        self.input_time.draw(screen)
            
        # HUD Text
        step_text = f"STEPS: {len(self.frames)}"
        step_surf = self.subtitle_font.render(step_text, True, theme.TEXT_MAIN)
        screen.blit(step_surf, (SCREEN_WIDTH // 2 - 50, SCREEN_HEIGHT - 130))
        
        # Side Panel Sidebar
        self.side_panel.draw(screen)
        
        # Only draw tool content if sidebar is open
        sw = self.side_panel.current_w
        if sw > 200:
            # Tools (3D, Clear) - Now just 2 buttons
            for btn in self.buttons[5:7]: btn.draw(screen)
            
            # Palette (RUN, PASS, BALL, TEXT, CURSOR) - 5 buttons
            # Indices 7 to 11
            for btn in self.buttons[7:12]:
                btn.draw(screen)
                # Highlight active tool
                is_active = False
                if self.current_tool == 'arrow_run' and btn.text == "RUN": is_active = True
                if self.current_tool == 'arrow_pass' and btn.text == "PASS": is_active = True
                if self.current_tool == 'ball' and btn.text == "BALL": is_active = True
                if self.current_tool == 'text' and btn.text == "TEXT": is_active = True
                if self.current_tool == 'cursor' and btn.text == "CURSOR": is_active = True
                if is_active:
                     pygame.draw.rect(screen, theme.ACCENT, btn.rect.inflate(4, 4), 2, border_radius=btn.radius)

            self.drop_view.draw(screen)
            self.drop_team_a.draw(screen)
            self.drop_add_a.draw(screen)
            self.drop_team_b.draw(screen)
            self.drop_add_b.draw(screen)
            self.slider_rot.draw(screen)

            # Draw any OPEN list on top of everything in sidebar
            for d in [self.drop_view, self.drop_team_a, self.drop_add_a, self.drop_team_b, self.drop_add_b]:
                if d.is_open:
                    d.draw_list(screen)
                    break
            
        # Top-level Buttons (Outside sidebar)
        for btn in self.buttons[:5]: btn.draw(screen) # Back, HUD Actions
        self.buttons[12].draw(screen) # SAVE
            
        # Title Overlay
        # (We are using InputBox for title now, so maybe hide this or keep as label)
        # screen.blit(title_surf, (80, 25))

    def handle_event(self, event):
        # Sidebar First
        if self.side_panel.handle_event(event): return
        
        sw = self.side_panel.current_w
        if sw > 200:
            if self.slider_rot.handle_event(event): return
            for btn in self.buttons[5:12]: # Sidebar tools
                if btn.handle_event(event): return
            if self.drop_team_a.handle_event(event): return
            if self.drop_team_b.handle_event(event): return
            if self.drop_view.handle_event(event): return
            if self.drop_add_a.handle_event(event): return
            if self.drop_add_b.handle_event(event): return

        # Top-level UI
        for btn in self.buttons[:5]: 
            if btn.handle_event(event): return
        if self.buttons[12].handle_event(event): return # SAVE

        self.input_time.handle_event(event)

        # Mouse Zoom (Scroll Wheel)
        if event.type == pygame.MOUSEWHEEL:
            projector.zoom = max(0.5, min(2.5, projector.zoom + event.y * 0.1))
            return True

        # Mouse Rotation (Right Click OR Left Click on Background)
        if event.type == pygame.MOUSEMOTION:
            is_right_drag = event.buttons[2]
            is_left_drag = event.buttons[0]
            
            # Check if any object is being dragged to prevent conflict
            object_dragging = any(p.is_dragging for p in self.players) or \
                              any(t.is_dragging for t in self.text_labels)
            
            # Rotate if Right Drag OR (Left Drag on empty space + Cursor Tool)
            if is_right_drag or (is_left_drag and self.current_tool == 'cursor' and not object_dragging):
                dx = event.rel[0]
                projector.rotate(dx * 0.5)
                self.slider_rot.val = projector.angle
                self.slider_rot.update_handle_pos()
                return True

        if not self.playing:
            # Handle Drawing Tools (Cursor, Arrow, Text)
            if self.current_tool in ['arrow_run', 'arrow_pass']:
                if event.type == pygame.MOUSEBUTTONDOWN and hasattr(event, 'pos'):
                    wx, wy = projector.from_screen(*event.pos)
                    if 0 <= wx <= 1 and 0 <= wy <= 1:
                        self.active_arrow = DrillArrow(event.pos, 'run' if self.current_tool == 'arrow_run' else 'pass')

                elif event.type == pygame.MOUSEMOTION and hasattr(event, 'pos'):
                    if self.active_arrow:
                        self.active_arrow.add_point(event.pos)

                elif event.type == pygame.MOUSEBUTTONUP:
                    if self.active_arrow:
                        self.arrows.append(self.active_arrow)
                        self.active_arrow = None
            
            elif self.current_tool == 'text':
                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and hasattr(event, 'pos'):
                    wx, wy = projector.from_screen(*event.pos)
                    if 0 <= wx <= 1 and 0 <= wy <= 1:
                         new_txt = TextObject(f"txt_{len(self.text_labels)}", wx, wy, "LABEL")
                         self.text_labels.append(new_txt)
                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 3 and hasattr(event, 'pos'):
                    for t in reversed(self.text_labels):
                        if t.rect.collidepoint(event.pos):
                            self.text_labels.remove(t)
                            self.text_labels.remove(t)
                            return
            
            elif self.current_tool == 'ball':
                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and hasattr(event, 'pos'):
                    wx, wy = projector.from_screen(*event.pos)
                    # Allow placing slightly outside lines, but generally on pitch
                    if -0.1 <= wx <= 1.1 and -0.1 <= wy <= 1.1:
                         self.players.append(DrillObject(f"ball_{random.randint(0,9999)}", wx, wy, BALL_COLOR, BALL_STROKE, "", "ball"))

            elif self.current_tool == 'cursor':
                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 3 and hasattr(event, 'pos'):
                    for p in reversed(self.players):
                        if p.handle_event(event): pass
                        sx, sy = projector.to_screen(p.pos.x, p.pos.y)
                        if pygame.Vector2(event.pos).distance_to((sx, sy)) < 25:
                            self.players.remove(p)
                            return
                    for arr in reversed(self.arrows):
                        if arr.collidepoint(event.pos):
                            self.arrows.remove(arr)
                            return
                    for t in reversed(self.text_labels):
                        if t.rect.collidepoint(event.pos):
                            self.text_labels.remove(t)
                            return
                
                for p in reversed(self.players):
                    if p.handle_event(event): break
                for t in reversed(self.text_labels):
                    if t.handle_event(event): break

        self.input_title.handle_event(event)
        self.input_note.handle_event(event)
        self.input_time.handle_event(event)



class LoginScene:
    def __init__(self, manager):
        self.manager = manager
        self.title_font = pygame.font.SysFont("segoeui", 40, bold=True)
        self.msg_font = pygame.font.SysFont("segoeui", 18)
        self.mode = 'login' # 'login' or 'register'
        
        # Load Icon
        self.icon = None
        try:
            import os
            self.icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_icon.png")
            if os.path.exists(self.icon_path):
                img = pygame.image.load(self.icon_path).convert_alpha()
                self.icon = pygame.transform.smoothscale(img, (140, 140))
        except Exception as e:
            print(f"DEBUG: Login icon load fail: {e}")
        
        # UI Elements
        center_x = SCREEN_WIDTH // 2
        start_y = 250
        
        self.input_user = InputBox(center_x - 150, start_y, 300, 40, "Username")
        self.input_pass = InputBox(center_x - 150, start_y + 60, 300, 40, "Password", is_password=True)
        self.input_team = InputBox(center_x - 150, start_y + 120, 300, 40, "Team Name")
        self.input_coach = InputBox(center_x - 150, start_y + 180, 300, 40, "Enter Coach Username")
        
        # Role State
        self.role = 'coach' # 'coach' or 'player'
        self.btn_role = Button(center_x - 150, start_y - 60, 300, 40, "ROLE: COACH", self.toggle_role, None, ELECTRIC_BLUE)
        
        # Buttons
        self.btn_action = Button(center_x - 150, start_y + 180, 300, 40, "LOGIN", self.do_action, ACCENT_GREEN, WHITE)
        self.btn_toggle = Button(center_x - 100, start_y + 240, 200, 30, "Create an Account", self.toggle_mode, None, ACCENT_YELLOW)
        
        self.message = "Welcome Back, Coach"
        self.msg_color = theme.TEXT_MUTED

    def toggle_role(self):
        self.role = 'player' if self.role == 'coach' else 'coach'
        self.btn_role.text = f"ROLE: {self.role.upper()}"
        self.btn_role.text_color = ACCENT_YELLOW if self.role == 'player' else ELECTRIC_BLUE

    def toggle_mode(self):
        if self.mode == 'login':
            self.mode = 'register'
            self.btn_action.text = "REGISTER"
            self.btn_action.bg_color = ACCENT_YELLOW
            self.btn_action.text_color = BLACK
            self.btn_toggle.text = "Back to Login"
            self.message = "Create your Profile"
        else:
            self.mode = 'login'
            self.btn_action.text = "LOGIN"
            self.btn_action.bg_color = ACCENT_GREEN
            self.btn_action.text_color = WHITE
            self.btn_toggle.text = "Create an Account"
            self.message = "Welcome Back"
        self.msg_color = TEXT_MUTED

    def do_action(self):
        if self.mode == 'login':
            self.do_login()
        else:
            self.do_register()

    def do_login(self):
        user = database.verify_user(self.input_user.text, self.input_pass.text)
        if user:
            if 'error' in user:
                 self.message = user['error']
                 self.msg_color = ACCENT_YELLOW
                 return
            self.manager.current_user = user
            self.manager.switch_scene("dashboard")
        else:
            self.message = "Invalid Username or Password"
            self.msg_color = ACCENT_RED

    def do_register(self):
        if not self.input_user.text or not self.input_pass.text:
            self.message = "Username and Password required"
            self.msg_color = ACCENT_RED
            return
            
        coach_name = self.input_coach.text if self.role == 'player' else None
        success, msg = database.create_user(
            self.input_user.text, 
            self.input_pass.text, 
            self.role, 
            self.input_team.text,
            coach_username=coach_name
        )
        if success:
             self.message = "Registration Successful! " + ("Login now." if self.role == 'coach' else "Wait for approval.")
             self.msg_color = ACCENT_GREEN
        else:
             self.message = f"Error: {msg}"
             self.msg_color = ACCENT_RED

    def handle_event(self, event):
        active_inputs = [self.input_user, self.input_pass]
        if self.mode == 'register':
            active_inputs.append(self.input_team)
            if self.role == 'player':
                active_inputs.append(self.input_coach)
            self.btn_role.handle_event(event)
            
        for inp in active_inputs:
            res = inp.handle_event(event)
            if res == 'submit': self.do_action()
            
        self.btn_action.handle_event(event)
        self.btn_toggle.handle_event(event)

    def update(self):
        projector.set_offset(0) # No sidebar in login
        # Usually no sidebar in login, but if there is:
        if hasattr(self, 'sidebar'): self.sidebar.update()

    def draw(self, screen):
        screen.fill(theme.UI_BG)
        
        # Logo Icon
        if self.icon:
            icon_rect = self.icon.get_rect(center=(SCREEN_WIDTH//2, 120))
            screen.blit(self.icon, icon_rect)
            title_y = 220
        else:
            title_y = 100

        # Title
        title = self.title_font.render("Football Management", True, theme.TEXT_MAIN)
        title_rect = title.get_rect(center=(SCREEN_WIDTH//2, title_y))
        screen.blit(title, title_rect)
        
        # Message
        msg_surf = self.msg_font.render(self.message, True, self.msg_color)
        msg_rect = msg_surf.get_rect(center=(SCREEN_WIDTH//2, title_y + 40))
        screen.blit(msg_surf, msg_rect)
        
        # Base Y for inputs
        base_y = title_y + 100
        
        # Set element positions
        self.btn_role.rect.centerx = SCREEN_WIDTH // 2
        self.btn_role.rect.y = base_y - 60
        
        self.input_user.rect.centerx = SCREEN_WIDTH // 2
        self.input_user.rect.y = base_y
        
        self.input_pass.rect.centerx = SCREEN_WIDTH // 2
        self.input_pass.rect.y = base_y + 60
        
        active_inputs = [self.input_user, self.input_pass]
        
        if self.mode == 'register':
            self.btn_role.draw(screen)
            self.input_team.rect.centerx = SCREEN_WIDTH // 2
            self.input_team.rect.y = base_y + 120
            active_inputs.append(self.input_team)
            
            if self.role == 'player':
                self.input_coach.rect.centerx = SCREEN_WIDTH // 2
                self.input_coach.rect.y = base_y + 180
                active_inputs.append(self.input_coach)
                self.btn_action.rect.y = base_y + 240
                self.btn_toggle.rect.y = base_y + 300
            else:
                self.btn_action.rect.y = base_y + 180
                self.btn_toggle.rect.y = base_y + 240
        else:
            self.btn_action.rect.y = base_y + 120
            self.btn_toggle.rect.y = base_y + 180

        for inp in active_inputs:
            inp.draw(screen)
            
        self.btn_action.rect.centerx = SCREEN_WIDTH // 2
        self.btn_action.draw(screen)
        self.btn_toggle.rect.centerx = SCREEN_WIDTH // 2
        self.btn_toggle.draw(screen)


class DashboardScene:
    def __init__(self, manager):
        self.manager = manager
        self.user = self.manager.current_user
        self.user_name = self.user['username'] if self.user else "Coach"
        self.team_name = self.user['team_name'] if self.user else "My Team"
        self.is_coach = self.user.get('role') == 'coach' if self.user else True
        
        self.sidebar = Sidebar('dashboard', self.is_coach)
        
        # Get Real Data
        if self.user:
            self.sessions = database.get_user_sessions(self.user['id'])
        else:
            self.sessions = []
            
        self.btn_delete = None
            
        for s in self.sessions:
            if 'status' not in s: s['status'] = 'UPCOMING'
        
        self.week_offset = 0
        self.selected_date = datetime.date.today().strftime("%Y-%m-%d")
        self.day_rects = []
        
        self.font_header = pygame.font.SysFont("segoeui", 32, bold=True)
        self.font_sub = pygame.font.SysFont("segoeui", 22)
        self.font_small = pygame.font.SysFont("segoeui", 14)
        self.font_bold = pygame.font.SysFont("segoeui", 18, bold=True)

        self.next_session = next((s for s in self.sessions if s['date'] == self.selected_date), None)
        self.btn_review = None
        self.btn_delete = None
        if self.next_session:
             self.btn_review = Button(0, 0, 200, 50, "REVIEW DRILL", self.open_next_session, ELECTRIC_BLUE, BLACK, font_size=18)
             if self.is_coach:
                 self.btn_delete = Button(0, 0, 100, 50, "DELETE", self.delete_current_session, ACCENT_RED, WHITE, font_size=18)

        self.btn_add = Button(SCREEN_WIDTH - 80, SCREEN_HEIGHT - 80, 60, 60, "+", self.create_new, EMERALD_GREEN, WHITE, radius=30, font_size=32)
        self.btn_prev = Button(250, 120, 30, 30, "<", lambda: self.shift_week(-1), None, None)
        self.btn_next = Button(SCREEN_WIDTH - 40, 120, 30, 30, ">", lambda: self.shift_week(1), None, None)
        self.weather_forecast = {} # Date -> {'temp': X, 'desc': Y}

        self.fetch_weather_data()
        
    def fetch_weather_data(self):
        def on_forecast(data):
            if data:
                self.weather_forecast = data
            else:
                self.weather_forecast = {}
        
        weather.fetch_weather_forecast(on_forecast)

    def shift_week(self, amount):
        self.week_offset += amount

    def open_next_session(self):
        if self.next_session:
            # Inject autoplay
            data = self.next_session.copy()
            data['autoplay'] = True
            self.manager.switch_scene("editor", data)

    def create_new(self):
        self.manager.switch_scene("editor", {"title": "New Custom Drill", "id": 999, "date": self.selected_date})

    def select_date(self, date_str):
        self.selected_date = date_str
        session_on_day = next((s for s in self.sessions if s['date'] == date_str), None)
        if session_on_day:
            self.next_session = session_on_day
            self.btn_review = Button(0, 0, 200, 50, "REVIEW DRILL", self.open_next_session, ELECTRIC_BLUE, BLACK, font_size=18)
            if self.is_coach:
                self.btn_delete = Button(0, 0, 100, 50, "DELETE", self.delete_current_session, ACCENT_RED, WHITE, font_size=18)
            else:
                self.btn_delete = None
        else:
            self.next_session = None
            self.btn_review = None
            self.btn_delete = None

    def delete_current_session(self):
        if self.next_session:
            database.delete_session(self.next_session['id'])
            # Refresh
            self.sessions = database.get_user_sessions(self.user['id'])
            self.select_date(self.selected_date)

    def change_date(self, delta):
        # Calculate new date
        curr = datetime.datetime.strptime(self.selected_date, "%Y-%m-%d").date()
        new_date = curr + datetime.timedelta(days=delta)
        new_date_str = new_date.strftime("%Y-%m-%d")
        
        # Check if we need to shift week offset
        today = datetime.date.today()
        start_of_week = today - datetime.timedelta(days=today.weekday()) + datetime.timedelta(weeks=self.week_offset)
        end_of_week = start_of_week + datetime.timedelta(days=6)
        
        if new_date < start_of_week:
            self.shift_week(-1)
        elif new_date > end_of_week:
            self.shift_week(1)
            
        self.select_date(new_date_str)

    def update(self):
        pass

    def handle_event(self, event):
        if self.sidebar.handle_event(event, self.manager): return
        if self.btn_review and self.btn_review.handle_event(event): return
        if self.btn_delete and self.btn_delete.handle_event(event): return
        if self.btn_prev.handle_event(event): return
        if self.btn_next.handle_event(event): return
        if self.btn_add.handle_event(event): return
        
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_LEFT:
                self.change_date(-1)
            elif event.key == pygame.K_RIGHT:
                self.change_date(1)

        if event.type == pygame.MOUSEBUTTONDOWN:
            for rect, date_str in self.day_rects:
                if rect.collidepoint(event.pos):
                    self.select_date(date_str)

    def draw_header(self, screen):
        # Draw inside main area (offset by sidebar)
        tx = self.sidebar.current_w + 30
        ty = 40
        welcome = self.font_header.render(f"Hello, {self.user_name}", True, theme.TEXT_MAIN)
        screen.blit(welcome, (tx, ty))
        
        sub = self.font_small.render(f"Ready for training with {self.team_name}?", True, theme.TEXT_MUTED)
        screen.blit(sub, (tx, ty + 45))
        
        # Weather Display for Selected Date
        w_data = self.weather_forecast.get(self.selected_date)
        if w_data:
            w_text = f"{w_data['temp']}°C | {w_data['desc']}"
            w_col = EMERALD_GREEN if "Clear" in w_data['desc'] else ACCENT_YELLOW
            w_surf = self.font_bold.render(w_text, True, w_col)
            # Align weather to the right
            screen.blit(w_surf, (SCREEN_WIDTH - w_surf.get_width() - 40, ty + 10))

    def draw_week_strip(self, screen):
        self.day_rects = []
        base_x = self.sidebar.current_w + 30
        strip_w = SCREEN_WIDTH - base_x - 40
        slot_w = strip_w // 7
        
        today = datetime.date.today()
        start_of_week = today - datetime.timedelta(days=today.weekday()) + datetime.timedelta(weeks=self.week_offset)
        
        for i in range(7):
            day = start_of_week + datetime.timedelta(days=i)
            day_str = day.strftime("%Y-%m-%d")
            
            x = base_x + i * slot_w
            y = 100
            rect = pygame.Rect(x, y, slot_w - 10, 80)
            self.day_rects.append((rect, day_str))
            
            is_selected = day_str == self.selected_date
            is_today = day_str == today.strftime("%Y-%m-%d")
            
            bg = theme.CHARCOAL_CARD
            if is_selected: bg = ELECTRIC_BLUE
            elif is_today: bg = theme.SIDEBAR_ACTIVE
            
            pygame.draw.rect(screen, bg, rect, border_radius=12)
            if is_today and not is_selected:
                pygame.draw.rect(screen, ELECTRIC_BLUE, rect, 2, border_radius=12)
            
            # Text
            d_name = day.strftime("%a").upper()
            d_num = day.strftime("%d")
            
            col = WHITE if is_selected else theme.TEXT_MUTED
            name_surf = self.font_small.render(d_name, True, col)
            screen.blit(name_surf, (rect.centerx - name_surf.get_width()//2, rect.y + 15))
            
            num_surf = self.font_bold.render(d_num, True, WHITE if is_selected else theme.TEXT_MAIN)
            screen.blit(num_surf, (rect.centerx - num_surf.get_width()//2, rect.y + 35))
            
            # Mini Weather
            w_day = self.weather_forecast.get(day_str)
            if w_day:
                w_mini = self.font_small.render(f"{int(w_day['temp'])}°", True, theme.TEXT_HINT if not is_selected else WHITE)
                screen.blit(w_mini, (rect.centerx - w_mini.get_width()//2, rect.y + 60))

    def draw_hero_card(self, screen):
        base_x = self.sidebar.current_w + 30
        area_rect = pygame.Rect(base_x, 200, SCREEN_WIDTH - base_x - 40, 300)
        pygame.draw.rect(screen, theme.CHARCOAL_CARD, area_rect, border_radius=15)
        
        if self.next_session:
            # Info
            title = self.font_sub.render(self.next_session['title'], True, theme.TEXT_MAIN)
            screen.blit(title, (area_rect.x + 40, area_rect.y + 40))
            
            info = f"Scheduled for {self.next_session['time']} • Venue: Main Pitch"
            info_surf = self.font_small.render(info, True, theme.TEXT_MUTED)
            screen.blit(info_surf, (area_rect.x + 40, area_rect.y + 75))
            
            # Progress/Stats in Card
            pygame.draw.line(screen, theme.DEEP_CHARCOAL, (area_rect.x + 40, area_rect.y + 120), (area_rect.right - 40, area_rect.y + 120), 1)
            
            # Button
            if self.btn_review:
                self.btn_review.rect.topleft = (area_rect.x + 40, area_rect.y + 150)
                self.btn_review.draw(screen)
            if self.btn_delete:
                self.btn_delete.rect.topleft = (area_rect.x + 260, area_rect.y + 150)
                self.btn_delete.draw(screen)
        else:
            msg = self.font_sub.render("Rest Day 🧘", True, theme.TEXT_MUTED)
            screen.blit(msg, (area_rect.centerx - msg.get_width()//2, area_rect.centery - 20))
            sub = self.font_small.render("No drills scheduled for this date", True, theme.TEXT_HINT)
            screen.blit(sub, (area_rect.centerx - sub.get_width()//2, area_rect.centery + 20))

    def update(self):
        self.sidebar.update()

    def draw(self, screen):
        screen.fill(theme.DEEP_CHARCOAL)
        self.sidebar.draw(screen)
        self.draw_header(screen)
        self.draw_week_strip(screen)
        self.draw_hero_card(screen)
        self.btn_add.draw(screen)
        self.btn_prev.draw(screen)
        self.btn_next.draw(screen)

class TeamScene:
    def __init__(self, manager):
        self.manager = manager
        self.coach_id = self.manager.current_user['id']
        self.is_coach = self.manager.current_user['role'] == 'coach'
        self.sidebar = Sidebar('team', self.is_coach)
        
        self.title_font = pygame.font.SysFont("segoeui", 32, bold=True)
        self.list_font = pygame.font.SysFont("segoeui", 20)
        
        self.pending = database.get_pending_players(self.coach_id)
        self.approved = database.get_team_players(self.coach_id)
        
        self.input_new_user = InputBox(250, 600, 250, 40, "New Player Username")
        self.input_new_pass = InputBox(520, 600, 250, 40, "Player Password")
        self.btn_invite = Button(790, 600, 150, 40, "INVITE (ADD)", self.manual_invite, ACCENT_YELLOW, BLACK)
        
        self.approve_buttons = []
        self.msg = ""
        self.msg_col = theme.TEXT_MUTED
        self.refresh_ui()

    def manual_invite(self):
        if not self.input_new_user.text or not self.input_new_pass.text:
            self.msg = "Enter both username and password"
            self.msg_col = ACCENT_RED
            return
        
        success, msg = database.create_user(
            self.input_new_user.text, 
            self.input_new_pass.text, 
            'player', 
            self.manager.current_user['team_name'],
            coach_username=self.manager.current_user['username']
        )
        if success:
            import sqlite3
            conn = sqlite3.connect(database.DB_NAME)
            c = conn.cursor()
            c.execute('UPDATE users SET status = "APPROVED" WHERE username = ?', (self.input_new_user.text,))
            conn.commit()
            conn.close()
            
            self.msg = f"Player {self.input_new_user.text} added and approved!"
            self.msg_col = ACCENT_GREEN
            self.input_new_user.set_text("")
            self.input_new_pass.set_text("")
            self.refresh_ui()
        else:
            self.msg = f"Error: {msg}"
            self.msg_col = ACCENT_RED

    def refresh_ui(self):
        self.pending = database.get_pending_players(self.coach_id)
        self.approved = database.get_team_players(self.coach_id)
        self.approve_buttons = []
        for i, p in enumerate(self.pending):
            btn = Button(800, 160 + i*40 - 10, 120, 40, "APPROVE", lambda pid=p['id']: self.approve(pid), ACCENT_GREEN, WHITE)
            self.approve_buttons.append(btn)

    def approve(self, pid):
        database.approve_player(pid)
        self.refresh_ui()

    def handle_event(self, event):
        if self.sidebar.handle_event(event, self.manager): return
        self.input_new_user.handle_event(event)
        self.input_new_pass.handle_event(event)
        self.btn_invite.handle_event(event)
        for b in self.approve_buttons:
            b.handle_event(event)

    def update(self):
        self.sidebar.update()

    def draw(self, screen):
        screen.fill(theme.DEEP_CHARCOAL)
        self.sidebar.draw(screen)
        
        tx = self.sidebar.current_w + 30
        title = self.title_font.render(f"Team Management: {self.manager.current_user['team_name']}", True, ELECTRIC_BLUE)
        screen.blit(title, (tx, 40))
        
        # Draw Pending
        p_title = self.list_font.render("PENDING APPROVAL", True, ACCENT_YELLOW)
        screen.blit(p_title, (tx, 120))
        for i, p in enumerate(self.pending):
            txt = self.list_font.render(f"- {p['username']}", True, theme.TEXT_MAIN)
            screen.blit(txt, (tx + 20, 160 + i*40))
            if i < len(self.approve_buttons):
                self.approve_buttons[i].rect.x = tx + 150
                self.approve_buttons[i].rect.y = 160 + i*40 - 10
                self.approve_buttons[i].draw(screen)
                
        # Draw Approved
        a_title = self.list_font.render("TEAM ROSTER", True, EMERALD_GREEN)
        screen.blit(a_title, (tx + 350, 120))
        for i, p in enumerate(self.approved):
            txt = self.list_font.render(f"{i+1}. {p['username']}", True, theme.TEXT_MAIN)
            screen.blit(txt, (tx + 370, 160 + i*40))

        # Draw Invite Section
        i_title = self.list_font.render("QUICK INVITE (Add Player Manually)", True, ELECTRIC_BLUE)
        screen.blit(i_title, (tx, 450))
        
        self.input_new_user.rect.x = tx
        self.input_new_user.rect.y = 500
        self.input_new_user.draw(screen)
        
        self.input_new_pass.rect.x = tx + 270
        self.input_new_pass.rect.y = 500
        self.input_new_pass.draw(screen)
        
        self.btn_invite.rect.x = tx + 540
        self.btn_invite.rect.y = 500
        self.btn_invite.draw(screen)
        
        if self.msg:
            m_surf = self.list_font.render(self.msg, True, self.msg_col)
            screen.blit(m_surf, (tx, 560))

class AnalyticsScene:
    def __init__(self, manager):
        self.manager = manager
        self.is_coach = self.manager.current_user['role'] == 'coach'
        self.sidebar = Sidebar('analytics', self.is_coach)
        self.title_font = pygame.font.SysFont("segoeui", 32, bold=True)
        self.font_sub = pygame.font.SysFont("segoeui", 18)
        
    def handle_event(self, event):
        self.sidebar.handle_event(event, self.manager)

    def update(self): pass

    def update(self):
        self.sidebar.update()

    def draw(self, screen):
        screen.fill(theme.DEEP_CHARCOAL)
        self.sidebar.draw(screen)
        
        tx = self.sidebar.current_w + 30
        title = self.title_font.render("Performance Analytics", True, theme.TEXT_MAIN)
        screen.blit(title, (tx, 40))
        
        # Simple Chart Mockup
        chart_rect = pygame.Rect(tx, 100, SCREEN_WIDTH - tx - 40, 300)
        pygame.draw.rect(screen, theme.CHARCOAL_CARD, chart_rect, border_radius=15)
        
        label = self.font_sub.render("Squad Progression (Average Speed)", True, ELECTRIC_BLUE)
        screen.blit(label, (chart_rect.x + 20, chart_rect.y + 20))
        
        # Draw fake line chart
        pts = [(280, 350), (350, 320), (420, 340), (490, 280), (560, 250), (630, 270), (700, 220)]
        if len(pts) > 1:
            pygame.draw.lines(screen, ELECTRIC_BLUE, False, pts, 3)
            for p in pts: pygame.draw.circle(screen, WHITE, p, 4)

class NotificationScene:
    def __init__(self, manager):
        self.manager = manager
        self.is_coach = self.manager.current_user['role'] == 'coach'
        self.sidebar = Sidebar('notifications', self.is_coach)
        self.title_font = pygame.font.SysFont("segoeui", 32, bold=True)
        self.notifs = database.get_notifications(self.manager.current_user['id'])
        
    def handle_event(self, event):
        self.sidebar.handle_event(event, self.manager)

    def update(self): pass

    def update(self):
        self.sidebar.update()

    def draw(self, screen):
        screen.fill(theme.DEEP_CHARCOAL)
        self.sidebar.draw(screen)
        
        tx = self.sidebar.current_w + 30
        title = self.title_font.render("Inbox & Notifications", True, theme.TEXT_MAIN)
        screen.blit(title, (tx, 40))
        
        if not self.notifs:
            msg = pygame.font.SysFont("segoeui", 20).render("Your inbox is empty", True, theme.TEXT_MUTED)
            screen.blit(msg, (tx, 100))
        else:
            for i, n in enumerate(self.notifs):
                rect = pygame.Rect(tx, 100 + i*90, SCREEN_WIDTH - tx - 40, 80)
                pygame.draw.rect(screen, theme.CHARCOAL_CARD, rect, border_radius=10)
                # ... draw notif content ...

class SceneManager:
    def __init__(self):
        self.current_user = None
        self.scene = LoginScene(self)
        
    def switch_scene(self, scene_name, data=None):
        if scene_name == "login":
            self.scene = LoginScene(self)
        elif scene_name == "dashboard":
            self.scene = DashboardScene(self)
        elif scene_name == "team":
            self.scene = TeamScene(self)
        elif scene_name == "analytics":
            self.scene = AnalyticsScene(self)
        elif scene_name == "notifications":
            self.scene = NotificationScene(self)
        elif scene_name == "editor":
            self.scene = EditorScene(self, data)
            
    def run(self):
        # Use a local reference to dimensions to allow updates
        global SCREEN_WIDTH, SCREEN_HEIGHT
        projector.update_config(SCREEN_WIDTH, SCREEN_HEIGHT)
        screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.RESIZABLE)
        pygame.display.set_caption("Football Management")
        
        # Set App Icon
        try:
            icon = pygame.image.load("app_icon.png")
            pygame.display.set_icon(icon)
        except:
            pass # Icon skip if missing
        clock = pygame.time.Clock()
        
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                
                if event.type == pygame.VIDEORESIZE:
                    print(f"Resizing to: {event.size}")
                    SCREEN_WIDTH, SCREEN_HEIGHT = event.size
                    projector.update_config(SCREEN_WIDTH, SCREEN_HEIGHT)
                    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.RESIZABLE)
                    # Re-init current scene to adapt to new dimensions if possible
                    # We preserve user/session data
                    if isinstance(self.scene, LoginScene):
                        self.scene = LoginScene(self)
                    elif isinstance(self.scene, DashboardScene):
                        self.scene = DashboardScene(self)
                    elif isinstance(self.scene, EditorScene):
                        # Capture current editor state to re-init
                        data = {
                            'id': self.scene.session_id,
                            'title': self.scene.input_title.text,
                            'note': self.scene.input_note.text,
                            'time': self.scene.input_time.text,
                            'current_tool': self.scene.current_tool,
                            'playing': self.scene.playing,
                            'data': {
                                'players': [{'id': p.id, 'x': p.pos.x, 'y': p.pos.y, 'color': p.color, 'stroke': p.stroke_color, 'label': p.label, 'type': p.type} for p in self.scene.players],
                                'frames': list(self.scene.frames),
                                'text_labels': [{'id': t.id, 'x': t.pos.x, 'y': t.pos.y, 'text': t.text, 'color': t.color} for t in self.scene.text_labels],
                                'arrows': self.scene.arrows 
                            }
                        }
                        old_scene = self.scene
                        self.scene = EditorScene(self, data)
                        self.scene.current_tool = data['current_tool']
                        self.scene.playing = data['playing']
                        self.scene.arrows = data['data']['arrows']
                        # Restore player current positions (EditorScene.__init__ uses start_pos)
                        for i, p in enumerate(self.scene.players):
                             if i < len(old_scene.players):
                                 p.pos = old_scene.players[i].pos.copy()

                self.scene.handle_event(event)

            self.scene.update()
            self.scene.draw(screen)
            
            pygame.display.flip()
            clock.tick(60)
            
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    pygame.init() # Fix: Init before creating scenes (which use fonts)
    app = SceneManager()
    app.run()
