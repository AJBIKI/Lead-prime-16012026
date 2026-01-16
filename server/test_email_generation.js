/**
 * Test script to generate email for an existing lead
 * Run with: node test_email_generation.js
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BACKEND_URL = 'http://localhost:5000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead_generator';

async function testEmailGeneration() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Get the Lead model
        const Lead = mongoose.model('Lead');

        // Find the first lead with research data
        const lead = await Lead.findOne({
            company_summary: { $exists: true, $ne: null }
        }).sort({ createdAt: -1 });

        if (!lead) {
            console.log('❌ No leads found with research data. Run a campaign first!');
            process.exit(1);
        }

        console.log(`\n✓ Found lead: ${lead.company_name}`);
        console.log(`  ID: ${lead._id}`);
        console.log(`  Summary: ${lead.company_summary?.substring(0, 100)}...`);

        // Generate email
        console.log('\n📧 Generating email...');

        const response = await axios.post(`${BACKEND_URL}/api/emails/generate`, {
            leadId: lead._id.toString(),
            userContext: {
                sender_name: 'John Doe',
                company: 'AI Solutions Inc',
                solution: 'AI-powered lead generation',
                website: 'aisolutions.com'
            }
        });

        const emailData = response.data;

        console.log('\n' + '='.repeat(60));
        console.log('✅ EMAIL GENERATED SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log(`\nSubject: ${emailData.email.subject}`);
        console.log(`\n${emailData.email.body}`);
        console.log('\n' + '='.repeat(60));
        console.log(`Template: ${emailData.email.template_id} (${emailData.email.template_category})`);
        console.log(`Match Score: ${emailData.email.template_match_score?.toFixed(3)}`);
        console.log(`LLM: ${emailData.email.llm_provider}`);
        console.log(`Tokens: ${emailData.email.tokens}`);
        console.log(`Cost: $${emailData.email.cost?.toFixed(5)}`);
        console.log('='.repeat(60));

        // Verify it was saved to database
        const updatedLead = await Lead.findById(lead._id);
        console.log(`\n✓ Email saved to database`);
        console.log(`  Subject in DB: ${updatedLead.email_subject}`);

        await mongoose.disconnect();
        console.log('\n✓ Test complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

testEmailGeneration();
