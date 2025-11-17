# Prospect Management Feature

This feature allows users to import and manage prospect lists for outreach campaigns.

## Features

### 1. Prospect Import
- CSV file upload with drag-and-drop support
- Required columns: `email`, `first_name`
- Optional columns: `last_name`, `company`, `title`, `custom_field_1`, `custom_field_2`, `custom_field_3`
- Automatic duplicate detection (by email within a list)
- Preview of first 5 rows before import

### 2. Prospect List Management
- View all prospect lists
- See stats for each list (total, active, contacted, replied)
- Delete prospect lists
- Search and filter prospects within a list

### 3. Prospect Details
- View individual prospect information
- Track prospect status (active, contacted, engaged, replied, bounced, unsubscribed)
- See last contacted date
- Pagination support (50 prospects per page)

## CSV Format Example

```csv
email,first_name,last_name,company,title
john@example.com,John,Doe,Acme Corp,CEO
jane@example.com,Jane,Smith,Tech Inc,CTO
```

## API Endpoints

### POST /api/prospects/import
Import prospects from CSV data.

**Request Body:**
```json
{
  "listName": "Q4 Prospects",
  "prospects": [
    {
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "company": "Acme Corp",
      "title": "CEO"
    }
  ]
}
```

### GET /api/prospects/lists
Fetch all prospect lists for the authenticated user.

**Response:**
```json
{
  "lists": [
    {
      "id": "uuid",
      "name": "Q4 Prospects",
      "source": "csv",
      "total_prospects": 100,
      "active_prospects": 95,
      "stats": {
        "total": 100,
        "active": 95,
        "contacted": 50,
        "replied": 10
      }
    }
  ]
}
```

### GET /api/prospects/lists/[listId]
Fetch prospects for a specific list with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `search` (optional)
- `status` (optional)

### DELETE /api/prospects/lists?listId=[listId]
Delete a prospect list and all associated prospects.

## Database Schema

### prospect_lists
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `name` (text)
- `source` (csv | google_sheets)
- `total_prospects` (integer)
- `active_prospects` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### prospects
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `list_id` (uuid, foreign key)
- `email` (text)
- `first_name` (text)
- `last_name` (text, nullable)
- `company` (text, nullable)
- `title` (text, nullable)
- `custom_field_1` (text, nullable)
- `custom_field_2` (text, nullable)
- `custom_field_3` (text, nullable)
- `status` (active | contacted | engaged | replied | bounced | unsubscribed)
- `last_contacted_at` (timestamp, nullable)
- `engagement_score` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own prospect lists and prospects
- Email validation on import
- Duplicate detection within lists
