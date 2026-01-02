import pygame

# Dimensions
SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 800
PITCH_MARGIN = 60
UI_HEIGHT = 100

# Player Defaults
PLAYER_RADIUS = 16
FONT_SIZE = 18

# Static Colors (Don't change usually)
GRASS_DARK = (46, 139, 87)
GRASS_LIGHT = (60, 179, 113)
LINE_COLOR = (240, 240, 240, 200)
TEAM_A_COLOR = (220, 38, 38)
TEAM_A_STROKE = (127, 29, 29)
TEAM_B_COLOR = (37, 99, 235)
TEAM_B_STROKE = (30, 58, 138)
BALL_COLOR = (255, 255, 255)
BALL_STROKE = (20, 20, 20)
CONE_COLOR = (245, 158, 11)
GOAL_COLOR = (255, 255, 255)
LADDER_COLOR = (250, 204, 21)
ELECTRIC_BLUE = (0, 190, 255)
EMERALD_GREEN = (0, 210, 140)
ACCENT_GREEN = EMERALD_GREEN
ACCENT_YELLOW = (250, 200, 50)
ACCENT_RED = (240, 60, 60)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
ARROW_PASS = (255, 255, 0)
ARROW_RUN = (255, 255, 255)
ARROW_WIDTH = 3

class Theme:
    def __init__(self, mode='dark'):
        self.set_mode(mode)

    def set_mode(self, mode):
        self.mode = mode
        if mode == 'dark':
            self.UI_BG = (15, 23, 42)         # Slate 900
            self.UI_PANEL = (30, 41, 59)      # Slate 800
            self.DEEP_CHARCOAL = (15, 23, 42) 
            self.CHARCOAL_CARD = (51, 65, 85) # Slate 700
            self.TEXT_MAIN = (248, 250, 252)  # Slate 50
            self.TEXT_MUTED = (148, 163, 184) # Slate 400
            self.TEXT_HINT = (100, 116, 139)  
            self.SIDEBAR_ACTIVE = (59, 130, 246, 60) # Blue 500 alpha
            self.BORDER = (51, 65, 85)        # Slate 700
            self.ACCENT = (59, 130, 246)      # Blue 500 (Professional Blue)
            self.SHADOW = (0, 0, 0, 100)
        else: # Light Mode (Professional Cloud)
            self.UI_BG = (241, 245, 249)      # Slate 100
            self.UI_PANEL = (255, 255, 255)   # White
            self.DEEP_CHARCOAL = (226, 232, 240) # Slate 200
            self.CHARCOAL_CARD = (255, 255, 255)
            self.TEXT_MAIN = (15, 23, 42)     # Slate 900
            self.TEXT_MUTED = (100, 116, 139) # Slate 500
            self.TEXT_HINT = (148, 163, 184)
            self.SIDEBAR_ACTIVE = (219, 234, 254) # Blue 100
            self.BORDER = (203, 213, 225)     # Slate 300
            self.ACCENT = (37, 99, 235)       # Blue 600
            self.SHADOW = (15, 23, 42, 20)    # Soft colored shadow

theme = Theme('dark')

# Legacy Support (defaults)
UI_BG = theme.UI_BG
UI_PANEL = theme.UI_PANEL
DEEP_CHARCOAL = theme.DEEP_CHARCOAL
CHARCOAL_CARD = theme.CHARCOAL_CARD
TEXT_MAIN = theme.TEXT_MAIN
TEXT_MUTED = theme.TEXT_MUTED
TEXT_HINT = theme.TEXT_HINT
BORDER = theme.BORDER
ACCENT = theme.ACCENT
