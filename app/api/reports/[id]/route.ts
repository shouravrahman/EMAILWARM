import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { admin_response, status } = body;

    // Check if user is admin
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Validate status
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      admin_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (admin_response) {
      updateData.admin_response = admin_response.trim();
    }

    if (status) {
      updateData.status = status;
      
      // Set resolved_at timestamp for resolved/closed status
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }
    }

    // Update report
    const { data, error } = await supabase
      .from('user_reports')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating report:', error);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Report updated successfully' 
    });

  } catch (error) {
    console.error('Error in PUT /api/reports/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.user_metadata?.role === 'admin';

    let query = supabase
      .from('user_reports')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq('id', params.id);

    // Non-admin users can only see their own reports
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching report:', error);
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });

  } catch (error) {
    console.error('Error in GET /api/reports/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}