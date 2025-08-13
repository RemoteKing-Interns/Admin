# Admin Panel with Next.js

A modern admin panel built with Next.js, TypeScript, Tailwind CSS, MongoDB, and AWS S3 for file uploads.

## Features

- **Brand Management**: List, view, and add brands with logos
- **File Uploads**: Direct-to-S3 uploads using presigned URLs
- **Responsive Design**: Works on desktop and mobile devices
- **Type Safety**: Built with TypeScript for better developer experience
- **Modern UI**: Styled with Tailwind CSS

## Prerequisites

- Node.js 18.0.0 or later
- MongoDB database (local or Atlas)
- AWS account with S3 bucket configured

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adminpanel-next
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Update the values with your configuration

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/adminpanel

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_bucket_name

# Base URL for S3 files (optional)
NEXT_PUBLIC_S3_PUBLIC_URL_BASE=https://your-bucket.s3.your-region.amazonaws.com
```

## Project Structure

```
src/
├── app/                    # App Router
│   ├── api/                # API routes
│   │   ├── brands/         # Brand management API
│   │   └── uploads/        # File upload endpoints
│   ├── brands/             # Brand pages
│   │   ├── new/            # Add new brand
│   │   └── page.tsx        # List brands
│   ├── globals.css         # Global styles
│   └── layout.tsx          # Root layout
├── lib/                   # Utility functions
│   ├── db.ts              # Database connection
│   └── s3.ts              # S3 client and helpers
├── models/                # Database models
│   └── Brand.ts           # Brand model
└── types/                 # TypeScript types
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel

1. Push your code to a Git repository
2. Import the repository on Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

### Self-Hosted

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## License

MIT
