# Aian Azure Hosting Guide 

Welcome to the Aian deployment guide! Since you have the GitHub Student Developer Pack with a $100/year credit on Azure, we need to be very smart about how we host this to ensure you don't burn through your credits in the first month.

## The Strategy: Single-Node Docker Deployment
Instead of using expensive "Managed Services" (like Azure Postgres or Azure App Service which can easily cost $50-$100+ per month alone), we will deploy **everything** (Frontend, Backend, PostgreSQL, and Neo4j) onto a single, affordable **Azure Linux Virtual Machine (VM)** using Docker Compose.

### Budget Breakdown & VM Selection
- **Recommended VM Size**: `Standard_B2s` (2 vCPUs, 4GB RAM). This provides enough memory for Neo4j and Next.js builds.
- **Estimated Cost**: ~$30/month. Your $100 credit will comfortably last about 3 to 4 months of 24/7 uptime. 
- **⚠️ WHAT IF 'B2s' IS NOT AVAILABLE?** 
  - Azure often restricts certain VM sizes in specific regions for Student accounts.
  - **Solution 1 (Best):** Change the **Region** in the Basics tab (try `East US 2`, `Central US`, `West Europe`, or `North Europe`). This almost always unlocks the `B2s` size.
  - **Solution 2 (Alternative Size):** Clear the search box and look for **`Standard_A2_v2`** (2 vCPUs, 4GB RAM). It is an older general-purpose VM that is usually available. It costs slightly more (~$43/month) but will still give you a solid 2 months of 24/7 uptime.
- *Tip:* If you turn the VM off when you aren't actively developing or presenting, the $100 can easily last the entire year!

---

## Step-by-Step Execution Plan

### Phase 1: Provision the Azure VM
1. Log into the **[Azure Portal](https://portal.azure.com)** using your student account.
2. Search for **"Virtual Machines"** in the top search bar and click **Create -> Azure Virtual Machine**.
3. **Basics Tab**:
   - **Resource Group**: Click "Create new" and name it `Aian-RG`.
   - **Virtual machine name**: `aian-server`
   - **Region**: Choose the region closest to you. 
     - ⚠️ **Policy Error?** If you get a `RequestDisallowedByAzure` error (or an error saying "The selected region is currently not accepting new customers"), it means Azure's datacenters in that region are currently full for Student accounts. **You must keep changing the Region** (Try `East US`, `South Central US`, `North Europe`, `Sweden Central`, or `France Central`) until the error goes away.
   - **Availability options**: Choose **"No infrastructure redundancy required"**. (You are building a single testing server on a strict budget, so you do not need expensive multi-zone redundancy).
   - **Image**: `Ubuntu Server 22.04 LTS - x64 Gen2`
   - **Size**: Click "See all sizes" and select **`Standard_B2s`** (or refer to the warning above if it's not available).
   - **Authentication type**: Choose **`SSH public key`** (Highly Recommended for Security). 
     - **Username**: Type a username (e.g., `azureuser`).
     - **SSH public key source**: Choose **"Generate new key pair"**.
     - **Key pair name**: `aian-ssh-key`
4. **Disks Tab (Cost Saving!)**:
   - **OS disk type**: Change from `Premium SSD` to **`Standard SSD`** or **`Standard HDD`**. (Premium SSDs are fast but cost more; Standard is perfectly fine for a dev server and saves you money!)
   - Leave everything else as default.
5. **Networking Tab**:
   - Allow selected ports: **HTTP (80)**, **HTTPS (443)**, and **SSH (22)**.
6. **Management, Monitoring, Advanced, Tags**:
   - You can completely skip these tabs! Just leave them at their default values.
7. Click **Review + Create** at the bottom of the screen, then click **Create**.
   - ⚠️ **CRITICAL:** A popup will appear saying "Generate new key pair". Click **"Download private key and create resource"**.
   - A `.pem` file (e.g., `aian-ssh-key.pem`) will download to your computer. Keep this safe, you CANNOT download it again!
8. Once deployed, click **Go to resource**. Note down the **Public IP address** of your new VM.

### Phase 2: Open Required Ports
By default, Azure blocks custom ports. We need to open ports so you can access the Database from your browser. (Ports 80 and 443 for your website are already opened in the previous step!).
1. On your VM page, go to **Settings > Networking** on the left menu.
2. Click **Add inbound port rule** (or "Add inbound security rule").
3. Fill out the form EXACTLY like this:
   - **Source**: `Any`
   - **Source port ranges**: `*`
   - **Destination**: `Any`
   - **Service**: `Custom`
   - **Destination port ranges**: `7474, 7687, 5555` *(Type exactly like this with commas!)*
   - **Protocol**: `Any` (or `TCP`)
   - **Priority**: `310`
   - **Name**: `Allow_Aian_App`
4. Click **Add** at the bottom.

### Phase 3: Connect and Install Docker
1. Open a terminal (Command Prompt, PowerShell, or Mac Terminal) on your local computer.
2. Navigate to the folder where your `.pem` file was downloaded (e.g., your Downloads folder):
   ```bash
   cd ~/Downloads
   ```
3. *(Mac/Linux Users Only)* Set the correct permissions for the key file:
   ```bash
   chmod 400 aian-ssh-key.pem
   ```
4. SSH into your VM using the downloaded `.pem` key and your Public IP:
   ```bash
   ssh -i aian-ssh-key.pem azureuser@YOUR_VM_PUBLIC_IP
   ```
   *(Type `yes` if it asks if you are sure you want to continue connecting).*
5. Update the server and install Docker by running these commands one by one:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install docker.io docker-compose -y
   sudo systemctl enable docker
   sudo systemctl start docker
   sudo usermod -aG docker $USER
   ```
6. **Important:** Type `exit` to disconnect, then SSH back in (using the same command from Step 4) so the docker permissions take effect.

### Phase 4: Deploy the Aian Project
1. Clone your Aian repository onto the VM:
   ```bash
   git clone https://github.com/your-username/Aian.git
   cd Aian
   ```
   *(If your repo is private, you will need to log into GitHub or use a Personal Access Token).*

2. **CRITICAL: Configure your Domain DNS**
   Before you start the server, you MUST log into your domain provider (where you bought `aiaan.tech`) and add an **A Record** pointing to your Azure VM's Public IP address:
   - **Host:** `@` (or leave blank) | **Value:** `YOUR_VM_PUBLIC_IP`
   *(This ensures that `aiaan.tech` goes to your server. Caddy will automatically route frontend traffic to the client, and `/api` traffic to the backend, while generating free SSL/HTTPS certificates!)*

3. Set up your environment variables for the Server:
   ```bash
   cd server
   cp .env.example .env
   nano .env
   ```
   *Edit the file and update `DATABASE_URL`, `NEO4J_URI`, and your Integration Keys. Your `FRONTEND_URL` and Redirect URIs should all just use `https://aiaan.tech`.*

4. Set up your environment variables for the Client:
   ```bash
   cd ../client
   cp .env.example .env
   nano .env
   ```
   *Ensure `API_URL` and `NEXT_PUBLIC_API_URL` point to `https://aiaan.tech`.*

### Phase 5: Build and Run
1. Go back to the root `Aian` directory:
   ```bash
   cd ~/Aian
   ```
2. Build and start everything in the background:
   ```bash
   docker-compose up -d --build
   ```
3. Wait about 3-5 minutes for everything to download, build, and start. You can check the progress by running:
   ```bash
   docker-compose logs -f
   ```
   *(Press `Ctrl + C` to exit the logs).*

4. **Database Migrations:** Once the server is running, you need to push your Prisma schema to the Postgres database:
   ```bash
   docker-compose exec server npx prisma db push
   ```

**🎉 YOU ARE DONE!** 
Your app is now live securely at `https://aiaan.tech`.

---

### Phase 6: How to Update Your Project
Whenever you write new code, fix bugs, or add features on your local computer, you will want to update your production VM.
It is extremely easy and requires zero downtime!

1. **On your local computer:** Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Updated features"
   git push
   ```
2. **On your Azure VM:** SSH into your server, pull the changes, and rebuild:
   ```bash
   cd ~/Aian
   git pull
   docker-compose up -d --build
   ```
   *(Docker will intelligently only rebuild the containers that changed, and will swap them out without bringing down the rest of your app!)*

---

## Important Azure Cost Saving Tips
- **Stop the VM when not in use:** If you are done presenting or testing for the day, go to the Azure Portal and click **Stop**. You do not pay for CPU/RAM when the VM is stopped (Deallocated), only a few pennies for the storage disk!
- **Set a Budget Alert:** Go to Azure Cost Management > Budgets. Set an alert for $80. Azure will email you if you are getting close to your $100 limit so you don't accidentally get billed.
