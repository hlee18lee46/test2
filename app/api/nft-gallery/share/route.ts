import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { mintAddress } = body;

    if (!mintAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "mintAddress is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE nft_gallery
      SET
        is_shared = TRUE,
        updated_at = NOW()
      WHERE mint_address = $1
      RETURNING *
      `,
      [mintAddress]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "NFT not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Shared to WhatTheHoot Gallery",
      nft: result.rows[0],
    });
  } catch (error) {
    console.error("Share gallery error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}