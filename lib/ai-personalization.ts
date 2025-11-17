import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface PersonalizationContext {
  prospect: {
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    company?: string | null;
    title?: string | null;
    custom_field_1?: string | null;
    custom_field_2?: string | null;
    custom_field_3?: string | null;
  };
  template: string;
  senderInfo?: {
    name?: string;
    company?: string;
    title?: string;
  };
}

export interface PersonalizedEmail {
  subject: string;
  body: string;
}

/**
 * Replace template variables with prospect data
 * Supports: {{first_name}}, {{last_name}}, {{company}}, {{title}}, {{custom_field_1}}, etc.
 */
export function replaceTemplateVariables(
  template: string,
  context: PersonalizationContext
): string {
  let result = template;

  // Prospect variables
  const variables: Record<string, string> = {
    first_name: context.prospect.first_name || '',
    last_name: context.prospect.last_name || '',
    company: context.prospect.company || '',
    title: context.prospect.title || '',
    custom_field_1: context.prospect.custom_field_1 || '',
    custom_field_2: context.prospect.custom_field_2 || '',
    custom_field_3: context.prospect.custom_field_3 || '',
  };

  // Sender variables (if provided)
  if (context.senderInfo) {
    variables.sender_name = context.senderInfo.name || '';
    variables.sender_company = context.senderInfo.company || '';
    variables.sender_title = context.senderInfo.title || '';
  }

  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Generate personalized email using AI
 * Uses Gemini to create natural, personalized content based on prospect data
 */
export async function generatePersonalizedEmail(
  context: PersonalizationContext
): Promise<PersonalizedEmail> {
  try {
    // First, replace template variables
    const processedTemplate = replaceTemplateVariables(context.template, context);

    // If Google API key is not configured, return template with variables replaced
    if (!process.env.GOOGLE_API_KEY) {
      console.warn('Google API key not configured. Using template without AI enhancement.');
      return extractSubjectAndBody(processedTemplate);
    }

    // Build AI prompt for personalization
    const prospectInfo = [
      context.prospect.first_name && `Name: ${context.prospect.first_name} ${context.prospect.last_name || ''}`.trim(),
      context.prospect.company && `Company: ${context.prospect.company}`,
      context.prospect.title && `Title: ${context.prospect.title}`,
    ].filter(Boolean).join('\n');

    const prompt = `You are an expert email copywriter. Enhance the following email template to make it more natural and personalized for the prospect. Keep the core message but add natural variations to avoid spam detection.

Prospect Information:
${prospectInfo}

Email Template:
${processedTemplate}

Requirements:
- Keep the email professional and concise
- Maintain the original intent and key points
- Add natural language variations
- Ensure it doesn't sound robotic or templated
- Keep the same approximate length
- Return ONLY the enhanced email with "Subject:" and "Body:" labels

Format your response exactly like this:
Subject: [enhanced subject line]
Body: [enhanced email body]`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const enhancedEmail = response.text();

    return extractSubjectAndBody(enhancedEmail);
  } catch (error) {
    console.error('Error generating personalized email:', error);
    // Fallback to template with variables replaced
    const processedTemplate = replaceTemplateVariables(context.template, context);
    return extractSubjectAndBody(processedTemplate);
  }
}

/**
 * Extract subject and body from email text
 * Expects format: "Subject: ...\nBody: ..." or just body text
 */
function extractSubjectAndBody(emailText: string): PersonalizedEmail {
  const lines = emailText.trim().split('\n');
  
  let subject = '';
  let body = '';
  let inBody = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.toLowerCase().startsWith('subject:')) {
      subject = line.substring(8).trim();
    } else if (line.toLowerCase().startsWith('body:')) {
      inBody = true;
      const bodyStart = line.substring(5).trim();
      if (bodyStart) {
        body = bodyStart;
      }
    } else if (inBody || (!subject && i > 0)) {
      if (body) {
        body += '\n' + line;
      } else {
        body = line;
      }
    }
  }

  // If no subject found, generate a default one
  if (!subject) {
    subject = 'Quick introduction';
  }

  // If no body found, use the entire text
  if (!body) {
    body = emailText;
  }

  return {
    subject: subject.trim(),
    body: body.trim(),
  };
}

/**
 * Validate template for required variables
 * Returns array of missing required variables
 */
export function validateTemplate(template: string): string[] {
  const requiredVariables = ['first_name'];
  const missingVariables: string[] = [];

  requiredVariables.forEach((variable) => {
    const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
    if (!regex.test(template)) {
      missingVariables.push(variable);
    }
  });

  return missingVariables;
}

/**
 * Get available template variables
 */
export function getAvailableVariables(): Array<{ key: string; description: string }> {
  return [
    { key: 'first_name', description: "Prospect's first name" },
    { key: 'last_name', description: "Prospect's last name" },
    { key: 'company', description: "Prospect's company" },
    { key: 'title', description: "Prospect's job title" },
    { key: 'custom_field_1', description: 'Custom field 1' },
    { key: 'custom_field_2', description: 'Custom field 2' },
    { key: 'custom_field_3', description: 'Custom field 3' },
    { key: 'sender_name', description: 'Your name' },
    { key: 'sender_company', description: 'Your company' },
    { key: 'sender_title', description: 'Your title' },
  ];
}
