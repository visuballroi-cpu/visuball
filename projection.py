import pygame
import math
from constants import *

class Projection:
    def __init__(self):
        self.mode = '3D' # '2D' or '3D'
        self.view_rect = (0.0, 0.0, 1.0, 1.0)
        self.offset_x = 0
        self.angle = 0.0 # Yaw
        self.zoom = 1.0
        
        # Camera Params for 3D
        self.camera_dist = 2.0
        self.camera_height = 1.2
        self.focal_length = 500
        
        self.update_config(SCREEN_WIDTH, SCREEN_HEIGHT)

    def update_config(self, w, h):
        self.w = w
        self.h = h

    def set_offset(self, x):
        self.offset_x = x

    def rotate(self, delta):
        self.angle = (self.angle + delta) % 360

    def set_view(self, view_name):
        if view_name == "Full":
            self.view_rect = (0.0, 0.0, 1.0, 1.0)
        elif view_name == "Left Half":
            self.view_rect = (0.0, 0.0, 0.5, 1.0)
        elif view_name == "Right Half":
            self.view_rect = (0.5, 0.0, 1.0, 1.0)
        elif view_name == "Center":
            self.view_rect = (0.25, 0.2, 0.75, 0.8)

    def to_screen(self, world_x, world_y, world_z=0):
        # 1. Transform to Model Space (FIFA Pitch centered at 0,0)
        # Pitch ratio 1.54:1
        mx = (world_x - 0.5) * 1.54
        my = (world_y - 0.5)
        
        # 2. Rotate in World Space (Yaw around center)
        rad = math.radians(self.angle)
        rx = mx * math.cos(rad) - my * math.sin(rad)
        rz = mx * math.sin(rad) + my * math.cos(rad) # rz is relative depth
        
        # Center of work area
        main_w = self.w - self.offset_x
        center_x = self.offset_x + main_w / 2
        center_y = (self.h - UI_HEIGHT) / 2 + 50

        if self.mode == '2D':
            s = min(main_w/1.8, (self.h-UI_HEIGHT)/1.8) * self.zoom
            sx = center_x + rx * s
            sy = center_y + rz * s
            return int(sx), int(sy)
        else:
            # 3D Depth
            # Invert: rz positive is NEAR (bottom of screen), rz negative is FAR (top)
            # Center (0) is at dist
            depth_from_cam = self.camera_dist - rz 
            
            if depth_from_cam < 0.1: depth_from_cam = 0.1
            
            # Scale for perspective
            scale = (self.focal_length * self.zoom) / depth_from_cam
            
            sx = center_x + rx * scale * (main_w / 1000)
            
            # Screen Y:
            # -0.5 (far) should be HIGH (up screen, small Y)
            # 0.5 (near) should be LOW (down screen, large Y)
            sy = center_y - 50 + (rz * scale * 0.8) - (world_z * scale * 1.0)
            
            return int(sx), int(sy)

    def from_screen(self, sx, sy):
        main_w = self.w - self.offset_x
        center_x = self.offset_x + main_w / 2
        center_y = (self.h - UI_HEIGHT) / 2 + 50
        
        if self.mode == '2D':
            s = min(main_w/1.8, (self.h-UI_HEIGHT)/1.8) * self.zoom
            rx = (sx - center_x) / s
            rz = (sy - center_y) / s
        else:
            # Inverse 3D (Approximate)
            # dy = sy - (cy - 50)
            # Solve rz = (dy * dist) / (k + dy)
            dy = sy - (center_y - 50)
            k = self.focal_length * self.zoom * 0.8
            
            rz = (dy * self.camera_dist) / (k + dy) if (k + dy) != 0 else 0
            
            depth_from_cam = self.camera_dist - rz
            scale = (self.focal_length * self.zoom) / depth_from_cam if depth_from_cam != 0 else 1
            rx = (sx - center_x) / (scale * (main_w / 1000))

        # Reverse Rotation
        rad = math.radians(-self.angle)
        mx = rx * math.cos(rad) - rz * math.sin(rad)
        my = rx * math.sin(rad) + rz * math.cos(rad)
        
        world_x = mx / 1.54 + 0.5
        world_y = my + 0.5
        return world_x, world_y

projector = Projection()
