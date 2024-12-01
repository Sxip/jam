# 💻 How to Install and Run Jam on MacOS

This guide will help you install and run **Jam** on **MacOS**.

## ✨ Step-by-Step Instructions

### 📲 Step 1: Install Jam

1. **Download the latest version of Jam.dmg** ⬇️  
   The latest version of [Jam.dmg](https://github.com/sxip/jam/releases/latest) can be found at https://github.com/sxip/jam/releases/latest.

2. **Mount the downloaded file** 💽  
   Double click `Jam.dmg` to mount.

3. **Install Jam** 📁  
   Move `Jam` to `/Applications/` by dragging it into the Applications folder.

4. **Eject Jam** ⏏️  
   Right click on the mouted `Jam` disk image and select "Eject"

### 🚀 Step 2: Launch Jam

1. **Open Terminal using spotlight** 🖥️  
   Search for `Terminal` and press enter.

2. **Run Jam as the root user** 🔑  
   Type `sudo /Applications/Jam.app/Contents/MacOS/Jam` and press enter.  
   Enter your password and wait for jam to instantiate.  

### 🛑 Step 3: Kill Jam
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;When finished, kill the process by entering `Ctrl + c` in the terminal.  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;This ensures that all processes are properly closed.

## ⚠️ Common Issues

1. **“Jam” cannot be opened because the developer cannot be verified.** *(Popup)*  
   Navigate to `System Settings > Privacy & Security` scroll down and select `Open Anyway` if Jam is blocked.

2. **Error during instantiation: listen EACCES: permission denied 127.0.0.1:443** 🌍 *(Jam Console)*  
   Ensure that you are running the app via `Terminal` with `sudo /Applications/Jam.app/Contents/MacOS/Jam`.  
   You must run the application as Root.

3. **Error: listen EADDRINUSE: address already in use :::8080** *(Terminal)*  
   As a concequence of running as Root, the application will not kill the server if you simply quit the application  
   Search for `Activity Monitor` then search for `Jam`. Select and highlight all Jam processes `Stop Sign > Force Quit`.  
   Ensure that you properly kill the process by entering `Ctrl + c` in the terminal after each session to avoid this.
