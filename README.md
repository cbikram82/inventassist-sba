# InventAssist - Inventory Management System
# Author - Bikram Chatterjee

A modern, user-friendly inventory management system built with Next.js, TypeScript, and Supabase. This application helps you track and manage inventory items across different locations with a focus on temple and religious organization needs.

## Features

- 📦 **Inventory Management**
  - Add, edit, and delete inventory items
  - Track quantities and categories
  - Add descriptions and dates for each item
  - Support for multiple categories (Cookware, Decorations, Consumables, Puja Items, Audio, Lighting)

- 📍 **Location Tracking**
  - Track items across two locations:
    - Safestore
    - Home (with person responsible)
  - Automatic validation to ensure person name is provided for home-stored items

- 📊 **Reporting**
  - Inventory value reports
  - Category-based summaries
  - Date-based tracking

- 🎨 **Modern UI/UX**
  - Clean, responsive design
  - Dark mode support
  - Loading states and animations
  - Accessible components

## Tech Stack

- **Frontend**
  - Next.js 15
  - TypeScript
  - Tailwind CSS
  - Shadcn UI Components
  - React Hook Form


- **Backend**
  - Supabase
  - PostgreSQL Database
  - Row Level Security

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/inventassist-sba.git
   cd inventassist-sba
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

1. Create a new Supabase project
2. Run the following SQL to set up the database schema:

```sql
-- Create inventory_items table
CREATE TABLE inventory_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT 'Safestore',
  "personName" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add constraints
ALTER TABLE inventory_items
ADD CONSTRAINT valid_location CHECK (location IN ('Safestore', 'Home')),
ADD CONSTRAINT home_location_requires_person CHECK (
  (location = 'Home' AND "personName" IS NOT NULL AND "personName" != '') OR
  (location = 'Safestore' AND "personName" IS NULL)
);
```

## Project Structure

```
inventassist-sba/
├── app/                    # Next.js app router pages
├── components/            # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and shared code
├── public/              # Static assets
├── styles/              # Global styles
└── types/               # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Copyright © 2024 Bikram Chatterjee. All rights reserved.

This software and associated documentation files (the "Software") are proprietary and confidential. The Software is protected by copyright law and international treaties.

No part of the Software may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the copyright holder.

Unauthorized copying, modification, distribution, public display, or public performance of the Software is strictly prohibited and is a violation of applicable laws and international treaties.

For licensing inquiries, please contact the copyright holder.
## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
