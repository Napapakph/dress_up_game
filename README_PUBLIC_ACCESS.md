# How to make your Dress-Up Game Public (for QR Scanning)

To make the QR code scannable from your phone, your PC must be accessible from the internet or your local network. The easiest way is using **ngrok** (a free tunneling tool).

## Step 1: Install ngrok

1. Go to [ngrok.com](https://ngrok.com) and sign up for a free account.
2. Download ngrok for Windows.
3. Unzip it and run `ngrok.exe`.
4. Connect your account (copy the command from your ngrok dashboard, e.g., `ngrok config add-authtoken ...`).

## Step 2: Start your App

1. Open a terminal in your project folder (`dress-up`).
2. Run:
   ```bash
   npm run dev
   ```
   (It usually runs on port 3000).

## Step 3: Start the Public Tunnel

1. Open a **second** terminal window.
2. Run:
   ```bash
   ngrok http 3000
   ```
3. You will see a `Forwarding` URL like `https://a1b2-c3d4.ngrok-free.app`.
   **Copy this URL.**

## Step 4: Use the Public URL

1. Open your browser and go to that **ngrok URL** (e.g., `https://a1b2-c3d4.ngrok-free.app`).
2. You will see your dress-up game.
3. Dress up your character!
4. Click **Export PNG** or **PDF**.
5. The **QR Code** generated will now point to this public URL (since you are visiting via the public URL).
6. **Scan it with your phone!** The game will open on your phone with the exact same character and items.
7. You can then download the image directly on your phone.

## Alternative: Local Network (WiFi)

If you don't want to use ngrok, ensure your PC and Phone are on the same WiFi.

1. Find your PC's IP address (run `ipconfig` in terminal, look for IPv4 Address, e.g., `192.168.1.5`).
2. On your PC browser, go to `http://192.168.1.5:3000` instead of `localhost:3000`.
3. The QR code will now encode `192.168.1.5` which your phone can scan (if on the same WiFi).
