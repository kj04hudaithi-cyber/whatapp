# 100% Free 24/7 WhatsApp Automation Server (Unlimited Messages & Users)

This guide shows you how to host your own private WhatsApp Automation Engine for **FREE** with **unlimited users and zero monthly subscription fees**.

---

## Why Use Your Own Free Cloud Server?
- ❌ **No UltraMsg/Twilio monthly fees** ($39/mo saved).
- ❌ **No message limits** — send as many receipts and bill reminders as you need.
- ❌ **No computer needed** — runs 24/7 on the cloud independently.
- ✅ **100% Free forever** using Render.com / Koyeb Docker hosting.

---

## 3-Minute Free Deployment Steps (Render.com)

### Step 1: Create a Free Render Account
1. Go to **[https://render.com](https://render.com)** and sign up for a free account.

### Step 2: Create a New Web Service
1. In your Render Dashboard, click **New +** &rarr; **Web Service**.
2. Choose **"Build and deploy from a Git repository"** or use the **Public Git Repo** option.
3. If deploying from a repository containing the `whatsapp-api` directory:
   - **Environment**: `Docker`
   - **Branch**: `main`
   - **Root Directory**: `whatsapp-api`
   - **Instance Type**: `Free` ($0/month)
4. Click **Deploy Web Service**.

### Step 3: Connect to MessMate35
Once deployed (takes ~2 minutes), Render gives you a live HTTPS URL:
```
https://messmate35-whatsapp-api.onrender.com
```

1. Open [`d:\Mass bill\config.php`](file:///d:/Mass%20bill/config.php)
2. Update the `WA_SERVER_URL`:
```php
define('WA_SERVER_URL', 'https://messmate35-whatsapp-api.onrender.com');
```
3. Upload `config.php` to your InfinityFree hosting.

---

## Step 4: Link Your WhatsApp (1-Time Scan)
1. Open your live app: `https://your-domain.com/wa_browser.php`
2. Scan the QR code with WhatsApp on your phone (**Linked Devices** &rarr; **Link a Device**).
3. That's it! Your server will now send WhatsApp receipts and bill alerts automatically 24/7 for all 33+ members for free!
