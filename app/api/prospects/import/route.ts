import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validation schema for prospect data
const prospectSchema = z.object({
  email: z.string().email('Invalid email format'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  custom_field_1: z.string().optional(),
  custom_field_2: z.string().optional(),
  custom_field_3: z.string().optional(),
});

const importRequestSchema = z.object({
  listName: z.string().min(1, 'List name is required'),
  prospects: z.array(prospectSchema).min(1, 'At least one prospect is required'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = importRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { listName, prospects } = validationResult.data;

    // Create prospect list
    const { data: prospectList, error: listError } = await supabase
      .from('prospect_lists')
      .insert({
        user_id: user.id,
        name: listName,
        source: 'csv',
        total_prospects: prospects.length,
        active_prospects: prospects.length,
      })
      .select()
      .single();

    if (listError) {
      console.error('Error creating prospect list:', listError);
      return NextResponse.json(
        { error: 'Failed to create prospect list' },
        { status: 500 }
      );
    }

    // Prepare prospects for insertion
    const prospectsToInsert = prospects.map((prospect: typeof prospectSchema._type) => ({
      user_id: user.id,
      list_id: prospectList.id,
      email: prospect.email.toLowerCase().trim(),
      first_name: prospect.first_name?.trim(),
      last_name: prospect.last_name?.trim(),
      company: prospect.company?.trim(),
      title: prospect.title?.trim(),
      custom_field_1: prospect.custom_field_1?.trim(),
      custom_field_2: prospect.custom_field_2?.trim(),
      custom_field_3: prospect.custom_field_3?.trim(),
      status: 'active' as const,
    }));

    // Insert prospects (handle duplicates by updating)
    const { data: insertedProspects, error: prospectsError } = await supabase
      .from('prospects')
      .upsert(prospectsToInsert, {
        onConflict: 'list_id,email',
        ignoreDuplicates: false,
      })
      .select();

    if (prospectsError) {
      console.error('Error inserting prospects:', prospectsError);
      // Clean up the list if prospect insertion fails
      await supabase.from('prospect_lists').delete().eq('id', prospectList.id);
      return NextResponse.json(
        { error: 'Failed to import prospects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      listId: prospectList.id,
      listName: prospectList.name,
      totalProspects: insertedProspects?.length || 0,
      message: `Successfully imported ${insertedProspects?.length || 0} prospects`,
    });
  } catch (error) {
    console.error('Error in prospect import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
