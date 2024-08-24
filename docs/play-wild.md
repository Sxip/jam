# 🐾 How to Connect Animal Jam Play Wild to a Custom Server

This guide will help you modify **Animal Jam Play Wild** to connect to **Jam**.

## ✨ Step-by-Step Instructions

### 📝 Step 1: Modify `settings.json`

1. **Locate the `settings.json` File** 📂  
   The `settings.json` file is usually located in the directory where Jam is installed.

2. **Open `settings.json` in a Text Editor** 🖊️  
   Right-click the file and select "Open with" -> "Notepad" or another text editor of your choice.

3. **Edit the `securesocket` Setting** 🔒  
   Find the line: `"securesocket": true,` and change it to: `"securesocket": false,`.

4. **Update the Server IP Address** 🌐  
   Look for the `smartfoxserver` entry and replace it with the new server IP:  
   `"smartfoxserver": "44.242.126.165"`

5. **Save and Close the File** 💾  
   Save your changes and close the text editor.

### 🖥️ Step 2: Modify the Windows `hosts` File

1. **Locate the `hosts` File** 📂  
   The `hosts` file is located at `C:\Windows\System32\drivers\etc\`.

2. **Open the `hosts` File in Administrator Mode** 🔑  
   Open Notepad as an administrator (right-click -> "Run as administrator").  
   In Notepad, go to `File` -> `Open` and navigate to the `hosts` file.

3. **Add a New Host Entry** ✍️  
   At the bottom of the `hosts` file, add the following line:  
   `127.0.0.1 aws-or-prod-iss02-mobile.animaljam.com`

4. **Save and Close the File** 💾  
   Save your changes and close the text editor.

### 🚀 Step 3: Launch Animal Jam Play Wild

1. **Run the Game Executable** 🎮  
   Double-click `Animal Jam.exe` to start the game.

2. **Connect to the Custom Server** 🌍  
   If all changes were made correctly, the game should now connect to **Jam**.