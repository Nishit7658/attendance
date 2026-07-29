import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import bcrypt from 'bcryptjs';

import { Client } from 'pg';

async function main() {
  const pass = "nickrock@010906";
  const ref = "rnvvhjywlkoqepsjzqqy";

  const regions = [
    "us-east-1",
    "us-west-1",
    "us-east-2",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "eu-central-1",
    "ap-south-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ap-northeast-2",
    "sa-east-1",
    "ca-central-1"
  ];

  for (const reg of regions) {
    const conn = `postgresql://postgres.${ref}:${encodeURIComponent(pass)}@aws-0-${reg}.pooler.supabase.com:6543/postgres`;
    const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const res = await client.query('SELECT current_database(), current_user;');
      console.log(`\n🎉 WORKING REGION FOUND! (${reg}):`, conn);
      console.log("SUCCESS!", res.rows[0]);
      await client.end();
      return conn;
    } catch (e: any) {
      if (!e.message.includes("ENOTFOUND")) {
        console.log(`[Region ${reg}]:`, e.message);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
