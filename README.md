# Echo - A Sound-Based Horror Experience

![Echo](https://raw.githubusercontent.com/Khushal-Me/echo-game/main/extra/Screenshot.png)

## Overview

**Echo** is an immersive horror game that challenges players to navigate through darkness using primarily audio cues. Your objective is to find the escape point (a faint blue sphere) while avoiding the threat that hunts you through sound.

## 🎮 How to Play

1. **Controls**: Use WASD or arrow keys to navigate
2. **Objective**: Find the blue sphere to escape
3. **Avoid**: Stay away from the red threat that's hunting you
4. **Listen**: Audio cues are crucial - they tell you where the threat and escape point are

> **⚠️ Headphones strongly recommended!** This game relies heavily on spatial audio for gameplay.

## 🔊 Audio Experience

Echo uses 3D spatial audio to create tension and guide your escape:
- The threat emits sounds that get louder as it gets closer
- The escape point produces a different sound to guide you
- Random environmental sounds create atmosphere and disorientation

## 🛠️ Technical Details

This game is built using:
- Three.js for 3D rendering
- Web Audio API for spatial audio
- Pure JavaScript for game logic

## 🚀 Play Now

[Play Echo online](https://khushal-me.github.io/Echo/)

## 🔧 Local Development

To run locally:

```bash
# Clone the repository
git clone https://github.com/Khushal-Me/Echo.git

# Navigate to the game directory
cd Echo

# Start a local server (if you have Python installed)
python -m http.server

# OR use http-server if you have Node.js
# npm install -g http-server
# http-server
```

Then open your browser and go to `http://localhost:8000` or `http://localhost:8080`.

## 💻 Browser Compatibility

Echo works best in modern browsers that support the Web Audio API and WebGL:
- Chrome
- Firefox (recommended)

## 📝 License

MIT License - Feel free to use, modify, and distribute this game!

## 👤 Created By

Developed by [Khushal-Me](https://github.com/Khushal-Me)
