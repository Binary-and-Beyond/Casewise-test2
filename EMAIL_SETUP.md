# Email Setup for Password Reset

To enable password reset functionality, you need to configure email settings in your environment variables.

## Required Environment Variables

Add these to your `.env` file in the `Casewise-backend` directory:

```env
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Frontend URL (for reset password links)
FRONTEND_URL=http://localhost:3000
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:

   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password (not your regular Gmail password)

3. **Update your `.env` file**:
   ```env
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   ```

## Other Email Providers

### Outlook/Hotmail

```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
```

### Yahoo

```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
```

### Custom SMTP

```env
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587
```

## Testing

1. Start the backend server
2. Go to the login page
3. Click "Forgot Password"
4. Enter a valid email address
5. Check your email for the reset link

## Security Notes

- Reset tokens expire after 1 hour
- Tokens can only be used once
- The system doesn't reveal if an email exists or not (for security)
- All passwords are hashed before storage

## Troubleshooting

- **"SMTP credentials not configured"**: Check your environment variables
- **"Failed to send email"**: Verify your SMTP settings and app password
- **"Invalid or expired reset token"**: The token may have expired or been used already
