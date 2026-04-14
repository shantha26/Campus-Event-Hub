import os

path = r'c:\Users\shali\OneDrive\Desktop\Group3_Team2\frontend\src\app\services\chat.service.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    # Detect the start of the broken block
    if "AI server is currently unavailable. Please try again later." in line:
        new_lines.append(line)
        # Check if next lines are the broken fragments
        if i + 1 < len(lines) and "options:" in lines[i+1]:
            # This is the good part of the error block
            continue
    
    # Surgical removal of the specific broken fragment identified in view_file
    if "text: 'I\\'m having trouble connecting to my AI brain right now." in line:
        skip = True
    if skip and "sendHelpMessage(role, isLoggedIn);" in line:
        # We also need to skip the closing braces of the broken block
        # Lines 254-256 were:
        # 254:       }
        # 255:     });
        # 256:   }
        # Since we don't know exactly how many lines, we skip until we see 'private sendHelpMessage'
        continue
    
    if skip and "private sendHelpMessage" in line:
        skip = False
    
    if not skip:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
