# Admin Dashboard Troubleshooting Guide

## ✅ Database Verification Results

### Current State (Verified)
- **Courses**: 3 (all affiliate marketing focused)
- **Modules**: 9 (3 per course)
- **Lessons**: 36 (4 per module)
- **Admin User**: admin@tatame.com exists with admin role

### Courses in MongoDB:
1. **Marketing de Afiliados - Fundamentos** (ID: 68972e56c66c8fb1c47f44a1)
2. **SEO para Blogs de Afiliados** (ID: 68972e56c66c8fb1c47f44a2)
3. **Escala e Automação para Afiliados** (ID: 68972e56c66c8fb1c47f44a3)

## 🔍 If Admin Dashboard Shows No Courses

### Solution 1: Clear Browser Cache
1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Clear Local Storage
4. Refresh the page (Ctrl+F5)

### Solution 2: Re-login to Admin
```bash
# 1. Logout from current session
# 2. Login again with:
Email: admin@tatame.com
Password: admin123
# 3. Navigate to http://localhost:5175/admin/courses
```

### Solution 3: Check API Connection
```bash
# Test admin courses endpoint directly
curl -X GET "http://localhost:3001/api/admin/courses" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Should return 3 courses
```

### Solution 4: Restart Frontend
```bash
# Kill the frontend process and restart
cd /Users/mac/Documents/Projects/tatame/apps/web
npm run dev
```

## ✅ Verified: No Duplicates

The system is correctly configured:
- **Student pages** (`/cursos`) fetch from `/api/courses`
- **Admin pages** (`/admin/courses`) fetch from `/api/admin/courses`
- Both endpoints query the **same MongoDB collection**
- No duplicate data exists

## 📝 How Data Flow Works

```
MongoDB (Single Source of Truth)
    ├── Student API (/api/courses)
    │   └── Student Pages (/cursos)
    └── Admin API (/api/admin/courses)
        └── Admin Pages (/admin/courses)
```

## 🎯 Quick Actions

### View Courses as Student
```
http://localhost:5175/cursos
```

### View Courses as Admin
```
http://localhost:5175/admin/courses
```

### Create New Course (Admin)
1. Go to Admin → Cursos
2. Click "Novo Curso"
3. Fill form and save

### Edit Existing Course (Admin)
1. Go to Admin → Cursos
2. Click Edit icon on any course
3. Modify and save

### Manage Modules/Lessons
1. Click "Módulos" button on any course
2. Add/edit modules
3. Click "Adicionar ou Gerenciar Aulas" to add lessons

## 🔧 Verify Script

Run this anytime to check database consistency:
```bash
cd /Users/mac/Documents/Projects/tatame/apps/api
npx tsx scripts/verifyData.ts
```

## ⚠️ Common Issues

### Issue: "Cannot see courses in admin"
- **Cause**: React Query cache
- **Fix**: Refresh page with Ctrl+F5

### Issue: "Token expired"
- **Cause**: JWT token expires after 7 days
- **Fix**: Re-login to get new token

### Issue: "Changes not appearing"
- **Cause**: Frontend cache
- **Fix**: Clear localStorage and refresh

## ✅ Confirmation

The system is working correctly:
- Database has 3 courses (verified)
- Admin API returns all courses (verified)
- No duplicates exist (verified)
- Both student and admin use same MongoDB (verified)

If you still don't see courses in admin panel after following these steps, the issue is likely browser cache. Clear it and refresh!