import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from './kv_store.tsx';
import { runWeeklyUpdates, schedulerHealthCheck, setupWeeklySchedule } from './scheduler.tsx';

const app = new Hono();

// Enable CORS for all routes
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Enable logging
app.use('*', logger(console.log));

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Health check endpoint
app.get('/make-server-99108478/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'GITAM Faculty Management System API is running',
    env: {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    }
  });
});

// Route: Faculty signup
app.post('/make-server-99108478/signup', async (c) => {
  try {
    const { facultyId, password, name, email, department, designation, mobile, researchArea } = await c.req.json();

    // Validate faculty ID (digits only)
    if (!/^\d+$/.test(facultyId)) {
      return c.json({ error: 'Faculty ID must contain only digits' }, 400);
    }

    // Create user account using Supabase auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: `${facultyId}@gitam.edu`, // Use faculty ID as email basis
      password,
      user_metadata: { 
        name,
        faculty_id: facultyId,
        department,
        designation,
        mobile,
        research_area: researchArea
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: 'Failed to create account: ' + error.message }, 400);
    }

    // Store faculty profile in KV store
    await kv.set(`faculty_profile_${data.user.id}`, {
      userId: data.user.id,
      facultyId,
      name,
      email: `${facultyId}@gitam.edu`,
      department,
      designation,
      mobile,
      researchArea,
      profileSetupComplete: false,
      createdAt: new Date().toISOString()
    });

    return c.json({ 
      success: true, 
      message: 'Account created successfully' 
    });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: 'Failed to create account: ' + error.message }, 500);
  }
});

// Route: Faculty login helper (to get profile data after auth)
app.post('/make-server-99108478/login', async (c) => {
  try {
    const { facultyId, password } = await c.req.json();

    // Use faculty ID as email for authentication
    const email = `${facultyId}@gitam.edu`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('Login error:', error);
      return c.json({ 
        success: false, 
        error: 'Invalid credentials. Please check your Faculty ID and password.' 
      }, 401);
    }

    if (data.session && data.user) {
      // Get faculty profile
      const profile = await kv.get(`faculty_profile_${data.user.id}`);
      
      return c.json({ 
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          accessToken: data.session.access_token,
          ...profile,
          isFirstTimeLogin: !profile?.profileSetupComplete
        }
      });
    }

    return c.json({ 
      success: false, 
      error: 'Login failed. Please try again.' 
    }, 401);
  } catch (error) {
    console.log('Login error:', error);
    return c.json({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }, 500);
  }
});

// Route: Save faculty scholar IDs and trigger initial data fetch
app.post('/make-server-99108478/setup-profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profileData = await c.req.json();

    // Get existing profile and merge with new data
    const existingProfile = await kv.get(`faculty_profile_${user.id}`) || {};

    // Save complete profile to faculty profile
    await kv.set(`faculty_profile_${user.id}`, {
      ...existingProfile,
      ...profileData,
      userId: user.id,
      profileSetupComplete: true,
      lastDataSync: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // If scholar IDs are provided, trigger initial data fetch
    if (profileData.googleScholarId || profileData.scopusId || profileData.orcidId || profileData.researcherId) {
      await Promise.all([
        fetchGoogleScholarData(user.id, profileData.googleScholarId),
        fetchScopusData(user.id, profileData.scopusId),
        fetchWebOfScienceData(user.id, profileData.researcherId),
        fetchORCIDData(user.id, profileData.orcidId)
      ]);

      // Schedule weekly background updates
      await scheduleWeeklyUpdates(user.id);
    }

    return c.json({ 
      success: true, 
      message: 'Profile setup complete' 
    });
  } catch (error) {
    console.log('Profile setup error:', error);
    return c.json({ error: 'Failed to setup profile: ' + error.message }, 500);
  }
});

// Route: Get faculty profile and academic statistics
app.get('/make-server-99108478/faculty-data/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    if (userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Get faculty profile
    const profile = await kv.get(`faculty_profile_${userId}`);
    
    // Get academic statistics
    const [publications, conferences, books, citations] = await Promise.all([
      kv.get(`publications_stats_${userId}`),
      kv.get(`conferences_stats_${userId}`),
      kv.get(`books_stats_${userId}`),
      kv.get(`citations_stats_${userId}`)
    ]);

    return c.json({
      profile,
      academicStats: {
        publications: publications || { total: 0, thisYear: 0, journals: 0 },
        conferences: conferences || { total: 0, international: 0, national: 0 },
        books: books || { total: 0, books: 0, chapters: 0 },
        citations: citations || { total: 0, hIndex: 0, i10Index: 0 }
      }
    });
  } catch (error) {
    console.log('Fetch faculty data error:', error);
    return c.json({ error: 'Failed to fetch faculty data: ' + error.message }, 500);
  }
});

// Route: Get publications for specific faculty
app.get('/make-server-99108478/publications/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    if (userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const publications = await kv.getByPrefix(`publication_${userId}_`);
    return c.json({ publications: publications || [] });
  } catch (error) {
    console.log('Fetch publications error:', error);
    return c.json({ error: 'Failed to fetch publications: ' + error.message }, 500);
  }
});

// Route: Get conferences for specific faculty
app.get('/make-server-99108478/conferences/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    if (userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const conferences = await kv.getByPrefix(`conference_${userId}_`);
    return c.json({ conferences: conferences || [] });
  } catch (error) {
    console.log('Fetch conferences error:', error);
    return c.json({ error: 'Failed to fetch conferences: ' + error.message }, 500);
  }
});

// Route: Get books and book chapters for specific faculty
app.get('/make-server-99108478/books/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    if (userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const books = await kv.getByPrefix(`book_${userId}_`);
    return c.json({ books: books || [] });
  } catch (error) {
    console.log('Fetch books error:', error);
    return c.json({ error: 'Failed to fetch books: ' + error.message }, 500);
  }
});

// Route: Manual sync trigger
app.post('/make-server-99108478/sync-data/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    if (userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Get faculty profile to retrieve scholar IDs
    const profile = await kv.get(`faculty_profile_${userId}`);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Fetch latest data from all sources
    await Promise.all([
      fetchGoogleScholarData(userId, profile.googleScholarId),
      fetchScopusData(userId, profile.scopusId),
      fetchWebOfScienceData(userId, profile.researcherId),
      fetchORCIDData(userId, profile.orcidId)
    ]);

    // Update last sync timestamp
    await kv.set(`faculty_profile_${userId}`, {
      ...profile,
      lastDataSync: new Date().toISOString()
    });

    return c.json({ 
      success: true, 
      message: 'Data sync completed successfully' 
    });
  } catch (error) {
    console.log('Manual sync error:', error);
    return c.json({ error: 'Failed to sync data: ' + error.message }, 500);
  }
});

// Academic data fetching functions
async function fetchGoogleScholarData(userId: string, scholarId: string) {
  if (!scholarId) return;

  try {
    // TODO: Implement actual Google Scholar API integration
    // For now, using placeholder data structure
    console.log(`Fetching Google Scholar data for user ${userId}, ID: ${scholarId}`);
    
    // This would be replaced with actual API calls to Google Scholar
    // const scholarData = await googleScholarAPI.getProfile(scholarId);
    // const publications = await googleScholarAPI.getPublications(scholarId);
    
    // Store sample data structure for now
    const samplePublications = [];
    for (let i = 0; i < 5; i++) {
      await kv.set(`publication_${userId}_gs_${i}`, {
        id: `gs_${i}`,
        source: 'google_scholar',
        title: `Sample Publication ${i + 1}`,
        journal: 'Sample Journal',
        year: 2024 - i,
        citations: Math.floor(Math.random() * 50),
        authors: ['Faculty Name'],
        fetchedAt: new Date().toISOString()
      });
    }

    // Update statistics
    await updatePublicationStats(userId);
    
  } catch (error) {
    console.log('Google Scholar fetch error:', error);
  }
}

async function fetchScopusData(userId: string, scopusId: string) {
  if (!scopusId) return;

  try {
    // TODO: Implement actual Scopus API integration
    console.log(`Fetching Scopus data for user ${userId}, ID: ${scopusId}`);
    
    // Placeholder for Scopus API integration
    // const scopusData = await scopusAPI.getAuthorProfile(scopusId);
    // const publications = await scopusAPI.getPublications(scopusId);
    
    await updatePublicationStats(userId);
    
  } catch (error) {
    console.log('Scopus fetch error:', error);
  }
}

async function fetchWebOfScienceData(userId: string, researcherId: string) {
  if (!researcherId) return;

  try {
    // TODO: Implement actual Web of Science API integration
    console.log(`Fetching Web of Science data for user ${userId}, ID: ${researcherId}`);
    
    await updatePublicationStats(userId);
    
  } catch (error) {
    console.log('Web of Science fetch error:', error);
  }
}

async function fetchORCIDData(userId: string, orcidId: string) {
  if (!orcidId) return;

  try {
    // TODO: Implement actual ORCID API integration
    console.log(`Fetching ORCID data for user ${userId}, ID: ${orcidId}`);
    
  } catch (error) {
    console.log('ORCID fetch error:', error);
  }
}

async function updatePublicationStats(userId: string) {
  try {
    const publications = await kv.getByPrefix(`publication_${userId}_`);
    const conferences = await kv.getByPrefix(`conference_${userId}_`);
    const books = await kv.getByPrefix(`book_${userId}_`);
    
    const currentYear = new Date().getFullYear();
    
    // Calculate publication statistics
    const publicationStats = {
      total: publications.length,
      thisYear: publications.filter(p => p.year === currentYear).length,
      journals: publications.filter(p => p.type === 'journal').length
    };
    
    // Calculate conference statistics  
    const conferenceStats = {
      total: conferences.length,
      international: conferences.filter(c => c.type === 'International').length,
      national: conferences.filter(c => c.type === 'National').length
    };
    
    // Calculate book statistics
    const bookStats = {
      total: books.length,
      books: books.filter(b => b.type === 'Book').length,
      chapters: books.filter(b => b.type === 'Book Chapter').length
    };
    
    // Calculate citation statistics
    const totalCitations = publications.reduce((sum, p) => sum + (p.citations || 0), 0);
    const citationStats = {
      total: totalCitations,
      hIndex: calculateHIndex(publications),
      i10Index: publications.filter(p => (p.citations || 0) >= 10).length
    };
    
    // Store updated statistics
    await Promise.all([
      kv.set(`publications_stats_${userId}`, publicationStats),
      kv.set(`conferences_stats_${userId}`, conferenceStats),
      kv.set(`books_stats_${userId}`, bookStats),
      kv.set(`citations_stats_${userId}`, citationStats)
    ]);
    
  } catch (error) {
    console.log('Update stats error:', error);
  }
}

function calculateHIndex(publications: any[]): number {
  const citations = publications
    .map(p => p.citations || 0)
    .sort((a, b) => b - a);
  
  let hIndex = 0;
  for (let i = 0; i < citations.length; i++) {
    if (citations[i] >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }
  
  return hIndex;
}

async function scheduleWeeklyUpdates(userId: string) {
  try {
    // TODO: Implement background job scheduling
    // This could use Deno cron jobs or external scheduling service
    console.log(`Scheduling weekly updates for user ${userId}`);
    
    // Store schedule information
    await kv.set(`scheduled_updates_${userId}`, {
      userId,
      frequency: 'weekly',
      nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      enabled: true
    });
    
  } catch (error) {
    console.log('Schedule updates error:', error);
  }
}

// Route: Add manual publication
app.post('/make-server-99108478/add-publication', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const publicationData = await c.req.json();
    const publicationId = `manual_${Date.now()}`;

    // Store publication
    await kv.set(`publication_${user.id}_${publicationId}`, {
      ...publicationData,
      id: publicationId,
      source: 'manual',
      userId: user.id,
      createdAt: new Date().toISOString()
    });

    // Update statistics
    await updatePublicationStats(user.id);

    return c.json({ 
      success: true, 
      message: 'Publication added successfully' 
    });
  } catch (error) {
    console.log('Add publication error:', error);
    return c.json({ error: 'Failed to add publication: ' + error.message }, 500);
  }
});

// Route: Add manual conference
app.post('/make-server-99108478/add-conference', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const conferenceData = await c.req.json();
    const conferenceId = `manual_${Date.now()}`;

    // Store conference
    await kv.set(`conference_${user.id}_${conferenceId}`, {
      ...conferenceData,
      id: conferenceId,
      source: 'manual',
      userId: user.id,
      createdAt: new Date().toISOString()
    });

    // Update statistics
    await updatePublicationStats(user.id);

    return c.json({ 
      success: true, 
      message: 'Conference added successfully' 
    });
  } catch (error) {
    console.log('Add conference error:', error);
    return c.json({ error: 'Failed to add conference: ' + error.message }, 500);
  }
});

// Route: Add manual book/book chapter
app.post('/make-server-99108478/add-book', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookData = await c.req.json();
    const bookId = `manual_${Date.now()}`;

    // Store book/chapter
    await kv.set(`book_${user.id}_${bookId}`, {
      ...bookData,
      id: bookId,
      source: 'manual',
      userId: user.id,
      createdAt: new Date().toISOString()
    });

    // Update statistics
    await updatePublicationStats(user.id);

    return c.json({ 
      success: true, 
      message: 'Book/Chapter added successfully' 
    });
  } catch (error) {
    console.log('Add book error:', error);
    return c.json({ error: 'Failed to add book: ' + error.message }, 500);
  }
});

// Scheduler endpoints
app.post('/make-server-99108478/run-weekly-updates', async (c) => {
  try {
    await runWeeklyUpdates();
    return c.json({ success: true, message: 'Weekly updates completed' });
  } catch (error) {
    console.log('Weekly updates error:', error);
    return c.json({ error: 'Failed to run weekly updates: ' + error.message }, 500);
  }
});

app.get('/make-server-99108478/scheduler-health', async (c) => {
  try {
    const health = await schedulerHealthCheck();
    return c.json(health);
  } catch (error) {
    console.log('Scheduler health check error:', error);
    return c.json({ error: 'Failed to check scheduler health: ' + error.message }, 500);
  }
});

// Initialize weekly schedule on startup
setupWeeklySchedule();

console.log('GITAM Faculty Management Server starting...');

// Start the server
serve(app.fetch, { port: 8000 });