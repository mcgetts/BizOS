#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from "drizzle-orm";
import {
  users,
  clients,
  projects,
  tasks,
  invoices,
  expenses,
  knowledgeArticles,
  marketingCampaigns,
  supportTickets,
  systemVariables,
} from "@shared/schema";

async function clearAllData() {
  console.log("🧹 Clearing all existing sample data...");

  // Clear all tables in correct order (respecting foreign key constraints)
  await db.delete(supportTickets);
  await db.delete(marketingCampaigns);
  await db.delete(knowledgeArticles);
  await db.delete(expenses);
  await db.delete(invoices);
  await db.delete(tasks);
  await db.delete(projects);
  await db.delete(clients);
  await db.delete(systemVariables);
  // Clear all users except Steven McGettigan if he exists
  await db.delete(users).where(sql`email != 'steven@mcgettigan.com'`);

  console.log("✅ All existing data cleared successfully");
}

async function createTeamMembers() {
  console.log("👥 Creating 10 team members with diverse roles...");

  const teamMembers = [
    {
      email: "steven@mcgettigan.com",
      firstName: "Steven",
      lastName: "McGettigan",
      role: "admin",
      department: "Executive",
      position: "CEO",
      phone: "+44 7900 123456",
      address: "London, UK",
      skills: ["Leadership", "Strategy", "Business Development"],
      profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "sarah.johnson@company.com",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "manager",
      department: "Project Management",
      position: "Senior Project Manager",
      phone: "+44 7900 234567",
      address: "Manchester, UK",
      skills: ["Project Management", "Agile", "Team Leadership", "Risk Management"],
      profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b68cba93?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "mike.chen@company.com",
      firstName: "Mike",
      lastName: "Chen",
      role: "employee",
      department: "Development",
      position: "Senior Full Stack Developer",
      phone: "+44 7900 345678",
      address: "Birmingham, UK",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"],
      profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "emma.williams@company.com",
      firstName: "Emma",
      lastName: "Williams",
      role: "employee",
      department: "Design",
      position: "UX/UI Designer",
      phone: "+44 7900 456789",
      address: "Leeds, UK",
      skills: ["Figma", "Adobe Creative Suite", "User Research", "Prototyping"],
      profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "david.brown@company.com",
      firstName: "David",
      lastName: "Brown",
      role: "employee",
      department: "Development",
      position: "DevOps Engineer",
      phone: "+44 7900 567890",
      address: "Edinburgh, UK",
      skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Monitoring"],
      profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "lisa.taylor@company.com",
      firstName: "Lisa",
      lastName: "Taylor",
      role: "employee",
      department: "Marketing",
      position: "Digital Marketing Specialist",
      phone: "+44 7900 678901",
      address: "Bristol, UK",
      skills: ["SEO", "Google Ads", "Social Media", "Content Marketing", "Analytics"],
      profileImageUrl: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "james.wilson@company.com",
      firstName: "James",
      lastName: "Wilson",
      role: "employee",
      department: "Support",
      position: "Customer Support Manager",
      phone: "+44 7900 789012",
      address: "Glasgow, UK",
      skills: ["Customer Service", "Technical Support", "Team Management", "CRM"],
      profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "rachel.davis@company.com",
      firstName: "Rachel",
      lastName: "Davis",
      role: "employee",
      department: "Finance",
      position: "Financial Analyst",
      phone: "+44 7900 890123",
      address: "Cardiff, UK",
      skills: ["Financial Analysis", "Excel", "Accounting", "Budgeting", "Reporting"],
      profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b68cba93?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "tom.anderson@company.com",
      firstName: "Tom",
      lastName: "Anderson",
      role: "employee",
      department: "Development",
      position: "Junior Developer",
      phone: "+44 7900 901234",
      address: "Liverpool, UK",
      skills: ["JavaScript", "Python", "React", "Learning", "Problem Solving"],
      profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      email: "anna.martinez@company.com",
      firstName: "Anna",
      lastName: "Martinez",
      role: "employee",
      department: "Quality Assurance",
      position: "QA Engineer",
      phone: "+44 7900 012345",
      address: "Nottingham, UK",
      skills: ["Test Automation", "Selenium", "API Testing", "Bug Tracking", "Quality Processes"],
      profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    }
  ];

  const createdUsers = [];
  for (const member of teamMembers) {
    // Use upsert to handle Steven McGettigan if he already exists
    const [user] = await db.insert(users).values(member)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          department: member.department,
          position: member.position,
          phone: member.phone,
          address: member.address,
          skills: member.skills,
          profileImageUrl: member.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    createdUsers.push(user);
    console.log(`✅ Created team member: ${user.firstName} ${user.lastName} (${user.position})`);
  }

  return createdUsers;
}

async function createClients(teamMembers: any[]) {
  console.log("🏢 Creating 20 client profiles with various industries...");

  const salesTeam = teamMembers.filter(u => u.role === "manager" || u.role === "admin");

  const clientProfiles = [
    {
      name: "TechStartup Ltd",
      email: "contact@techstartup.com",
      phone: "+44 20 7123 4567",
      company: "TechStartup Ltd",
      industry: "Technology",
      website: "https://techstartup.com",
      address: "123 Tech Street, London, SW1A 1AA",
      status: "client",
      source: "referral",
      assignedTo: salesTeam[0]?.id,
      totalValue: "45000.00",
      notes: "AI-powered SaaS platform development",
      tags: ["SaaS", "AI", "High Priority"]
    },
    {
      name: "GreenEnergy Solutions",
      email: "info@greenenergy.co.uk",
      phone: "+44 161 234 5678",
      company: "GreenEnergy Solutions",
      industry: "Renewable Energy",
      website: "https://greenenergy.co.uk",
      address: "456 Green Lane, Manchester, M1 2AB",
      status: "client",
      source: "website",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "78000.00",
      notes: "Solar panel management system",
      tags: ["Green Tech", "B2B", "Long-term"]
    },
    {
      name: "HealthCare Plus",
      email: "admin@healthcareplus.com",
      phone: "+44 121 345 6789",
      company: "HealthCare Plus",
      industry: "Healthcare",
      website: "https://healthcareplus.com",
      address: "789 Medical Center, Birmingham, B1 3CD",
      status: "client",
      source: "marketing",
      assignedTo: salesTeam[0]?.id,
      totalValue: "92000.00",
      notes: "Patient management system with GDPR compliance",
      tags: ["Healthcare", "GDPR", "Critical"]
    },
    {
      name: "EduLearn Academy",
      email: "contact@edulearn.edu",
      phone: "+44 131 456 7890",
      company: "EduLearn Academy",
      industry: "Education",
      website: "https://edulearn.edu",
      address: "321 Learning St, Edinburgh, EH1 4EF",
      status: "proposal",
      source: "referral",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "35000.00",
      notes: "Online learning platform development",
      tags: ["Education", "E-learning", "Scalable"]
    },
    {
      name: "RetailMax Chain",
      email: "it@retailmax.com",
      phone: "+44 113 567 8901",
      company: "RetailMax Chain",
      industry: "Retail",
      website: "https://retailmax.com",
      address: "654 Shopping Blvd, Leeds, LS1 5GH",
      status: "client",
      source: "website",
      assignedTo: salesTeam[0]?.id,
      totalValue: "56000.00",
      notes: "Inventory management and POS system",
      tags: ["Retail", "POS", "Multi-location"]
    },
    {
      name: "FinServ Partners",
      email: "tech@finserv.co.uk",
      phone: "+44 117 678 9012",
      company: "FinServ Partners",
      industry: "Financial Services",
      website: "https://finserv.co.uk",
      address: "987 Finance Way, Bristol, BS1 6IJ",
      status: "qualified",
      source: "referral",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "125000.00",
      notes: "Trading platform with real-time analytics",
      tags: ["FinTech", "Real-time", "High Value"]
    },
    {
      name: "LogiFlow Transport",
      email: "ops@logiflow.com",
      phone: "+44 141 789 0123",
      company: "LogiFlow Transport",
      industry: "Logistics",
      website: "https://logiflow.com",
      address: "147 Transport Hub, Glasgow, G1 7KL",
      status: "client",
      source: "marketing",
      assignedTo: salesTeam[0]?.id,
      totalValue: "67000.00",
      notes: "Fleet management and route optimization",
      tags: ["Logistics", "GPS", "Optimization"]
    },
    {
      name: "AgroTech Farms",
      email: "info@agrotech.co.uk",
      phone: "+44 29 2890 1234",
      company: "AgroTech Farms",
      industry: "Agriculture",
      website: "https://agrotech.co.uk",
      address: "258 Farm Road, Cardiff, CF1 8MN",
      status: "proposal",
      source: "website",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "43000.00",
      notes: "Smart farming IoT solutions",
      tags: ["IoT", "Agriculture", "Smart Tech"]
    },
    {
      name: "MediaFlow Studios",
      email: "contact@mediaflow.com",
      phone: "+44 151 901 2345",
      company: "MediaFlow Studios",
      industry: "Media & Entertainment",
      website: "https://mediaflow.com",
      address: "369 Creative Quarter, Liverpool, L1 9OP",
      status: "client",
      source: "referral",
      assignedTo: salesTeam[0]?.id,
      totalValue: "54000.00",
      notes: "Digital asset management system",
      tags: ["Media", "DAM", "Creative"]
    },
    {
      name: "PropTech Solutions",
      email: "tech@proptech.co.uk",
      phone: "+44 115 012 3456",
      company: "PropTech Solutions",
      industry: "Real Estate",
      website: "https://proptech.co.uk",
      address: "741 Property Lane, Nottingham, NG1 0QR",
      status: "qualified",
      source: "marketing",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "89000.00",
      notes: "Property management platform",
      tags: ["PropTech", "CRM", "Automated"]
    },
    {
      name: "CloudFirst Consulting",
      email: "hello@cloudfirst.com",
      phone: "+44 20 7234 5678",
      company: "CloudFirst Consulting",
      industry: "IT Consulting",
      website: "https://cloudfirst.com",
      address: "852 Cloud Street, London, EC1A 2ST",
      status: "lead",
      source: "website",
      assignedTo: salesTeam[0]?.id,
      totalValue: "0.00",
      notes: "Initial consultation for cloud migration",
      tags: ["Cloud", "Consulting", "Migration"]
    },
    {
      name: "SportsTech Arena",
      email: "info@sportstech.com",
      phone: "+44 161 345 6789",
      company: "SportsTech Arena",
      industry: "Sports & Recreation",
      website: "https://sportstech.com",
      address: "963 Sports Complex, Manchester, M2 3UV",
      status: "proposal",
      source: "referral",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "37000.00",
      notes: "Fan engagement mobile app",
      tags: ["Sports", "Mobile App", "Fan Engagement"]
    },
    {
      name: "AutoParts Direct",
      email: "systems@autoparts.co.uk",
      phone: "+44 121 456 7890",
      company: "AutoParts Direct",
      industry: "Automotive",
      website: "https://autoparts.co.uk",
      address: "159 Auto Street, Birmingham, B2 4WX",
      status: "client",
      source: "marketing",
      assignedTo: salesTeam[0]?.id,
      totalValue: "48000.00",
      notes: "Parts catalog and ordering system",
      tags: ["Automotive", "E-commerce", "B2B"]
    },
    {
      name: "LegalTech Partners",
      email: "it@legaltech.co.uk",
      phone: "+44 131 567 8901",
      company: "LegalTech Partners",
      industry: "Legal Services",
      website: "https://legaltech.co.uk",
      address: "753 Legal Quarter, Edinburgh, EH2 5YZ",
      status: "qualified",
      source: "referral",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "76000.00",
      notes: "Case management and document automation",
      tags: ["LegalTech", "Document Management", "Compliance"]
    },
    {
      name: "TravelWise Booking",
      email: "tech@travelwise.com",
      phone: "+44 113 678 9012",
      company: "TravelWise Booking",
      industry: "Travel & Tourism",
      website: "https://travelwise.com",
      address: "951 Travel Plaza, Leeds, LS2 6AA",
      status: "lead",
      source: "website",
      assignedTo: salesTeam[0]?.id,
      totalValue: "0.00",
      notes: "Travel booking platform requirements gathering",
      tags: ["Travel", "Booking", "Platform"]
    },
    {
      name: "FoodChain Solutions",
      email: "contact@foodchain.co.uk",
      phone: "+44 117 789 0123",
      company: "FoodChain Solutions",
      industry: "Food & Beverage",
      website: "https://foodchain.co.uk",
      address: "357 Food Court, Bristol, BS2 7BB",
      status: "proposal",
      source: "marketing",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "52000.00",
      notes: "Supply chain management system",
      tags: ["Supply Chain", "Food Safety", "Traceability"]
    },
    {
      name: "EventTech Pro",
      email: "hello@eventtech.com",
      phone: "+44 141 890 1234",
      company: "EventTech Pro",
      industry: "Events & Conferences",
      website: "https://eventtech.com",
      address: "468 Event Center, Glasgow, G2 8CC",
      status: "client",
      source: "referral",
      assignedTo: salesTeam[0]?.id,
      totalValue: "41000.00",
      notes: "Event management and ticketing platform",
      tags: ["Events", "Ticketing", "Management"]
    },
    {
      name: "InsureTech Now",
      email: "tech@insuretech.co.uk",
      phone: "+44 29 2901 2345",
      company: "InsureTech Now",
      industry: "Insurance",
      website: "https://insuretech.co.uk",
      address: "579 Insurance Row, Cardiff, CF2 9DD",
      status: "qualified",
      source: "website",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "83000.00",
      notes: "Claims processing automation system",
      tags: ["InsureTech", "Automation", "Claims"]
    },
    {
      name: "CleanTech Innovations",
      email: "info@cleantech.com",
      phone: "+44 151 012 3456",
      company: "CleanTech Innovations",
      industry: "Environmental Technology",
      website: "https://cleantech.com",
      address: "682 Green Innovation Hub, Liverpool, L2 0EE",
      status: "lead",
      source: "referral",
      assignedTo: salesTeam[0]?.id,
      totalValue: "0.00",
      notes: "Environmental monitoring system inquiry",
      tags: ["CleanTech", "Environmental", "Monitoring"]
    },
    {
      name: "CraftBrew Collective",
      email: "orders@craftbrew.co.uk",
      phone: "+44 115 123 4567",
      company: "CraftBrew Collective",
      industry: "Food & Beverage",
      website: "https://craftbrew.co.uk",
      address: "793 Brewery Lane, Nottingham, NG2 1FF",
      status: "proposal",
      source: "marketing",
      assignedTo: salesTeam[1]?.id || salesTeam[0]?.id,
      totalValue: "28000.00",
      notes: "Brewery management and distribution system",
      tags: ["Brewery", "Distribution", "Small Business"]
    }
  ];

  const createdClients = [];
  for (const client of clientProfiles) {
    const [newClient] = await db.insert(clients).values(client).returning();
    createdClients.push(newClient);
    console.log(`✅ Created client: ${newClient.company} (${newClient.industry} - ${newClient.status})`);
  }

  return createdClients;
}

// Run the main function
async function main() {
  try {
    console.log("🚀 Starting comprehensive sample data generation...\n");

    await clearAllData();
    console.log("");

    const teamMembers = await createTeamMembers();
    console.log("");

    const clientList = await createClients(teamMembers);
    console.log("");

    console.log("🎉 Phase 1 Complete - Team and Clients created!");
    console.log("📊 Summary so far:");
    console.log(`   👥 Team members: ${teamMembers.length}`);
    console.log(`   🏢 Clients: ${clientList.length}`);
    console.log("\n🔄 Continue with projects, tasks, and other data...");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error generating sample data:", error);
    process.exit(1);
  }
}

// Run the script
main();

export { clearAllData, createTeamMembers, createClients };