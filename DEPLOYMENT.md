# AI Toolbox - GitHub Pages Deployment Guide

This guide will help you deploy your AI Toolbox to GitHub Pages.

## Prerequisites

- A GitHub account
- Git installed on your computer
- Node.js and npm (optional, for manual deployment)

## File Structure

Your repository should have the following structure:
```
ai-toolbox/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── index.html
├── ai-toolbox.js
├── package.json
├── README.md
├── LICENSE
├── .gitignore
└── DEPLOYMENT.md (this file)
```

## Deployment Methods

### Method 1: Automatic Deployment with GitHub Actions (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click on "Settings" tab
   - Scroll down to "Pages" in the left sidebar
   - Under "Build and deployment":
     - Source: Select "GitHub Actions"
   - The workflow will automatically deploy your site

3. **Access your site**
   - Your site will be available at: `https://YOUR_USERNAME.github.io/ai-toolbox`
   - It may take a few minutes for the first deployment

### Method 2: Manual Deployment with gh-pages

1. **Update package.json**
   - Replace `YOUR_USERNAME` in the homepage URL with your GitHub username

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

4. **Enable GitHub Pages**
   - Go to your repository settings
   - Under "Pages", set:
     - Source: Deploy from a branch
     - Branch: gh-pages
     - Folder: / (root)

## Important Notes

### Claude Environment Requirement
- The AI features (Generate with AI, Run Template) only work within Claude.ai
- When accessed outside Claude, users will see a friendly message explaining this limitation
- The app still allows template creation and management outside Claude

### Browser Compatibility
- The app uses modern JavaScript features and requires a recent browser
- Tested on Chrome, Firefox, Safari, and Edge

### Data Storage
- All templates and history are stored in browser localStorage
- Data persists between sessions but is specific to each browser/device
- Consider backing up important templates by exporting them

## Customization

### Changing the Repository Name
If you want to use a different repository name:

1. Update the homepage in `package.json`:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/YOUR_REPO_NAME"
   ```

2. Update the base path if needed in your HTML

### Custom Domain
To use a custom domain:

1. Create a `CNAME` file in the root with your domain:
   ```
   yourdomain.com
   ```

2. Configure your domain's DNS settings to point to GitHub Pages

## Troubleshooting

### Site not loading
- Check that GitHub Pages is enabled in repository settings
- Ensure the deployment workflow completed successfully
- Clear browser cache and try again

### 404 errors
- Verify the repository name matches the URL
- Check that files are in the root directory
- Ensure the branch is set correctly in Pages settings

### JavaScript errors
- Check browser console for specific errors
- Ensure all required files are present
- Verify no syntax errors in the JavaScript file

## Updates and Maintenance

To update your deployed site:

1. Make changes locally
2. Commit and push to the main branch
3. GitHub Actions will automatically redeploy

## Security Considerations

- The app runs entirely in the browser
- No data is sent to external servers
- Claude API calls only work within Claude.ai environment
- All data is stored locally in the browser

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/YOUR_USERNAME/ai-toolbox/issues)
- Review the deployment logs in GitHub Actions
- Ensure you're following the deployment steps correctly

## License

This project is licensed under the MIT License - see the LICENSE file for details.