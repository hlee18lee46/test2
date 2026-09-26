import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// ---------------------------------------------------------
// Snowflake Postgres connection
// ---------------------------------------------------------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ---------------------------------------------------------
// Ensure NFT table exists
// ---------------------------------------------------------

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nft_gallery (
      mint_address TEXT PRIMARY KEY,
      owner_wallet TEXT NOT NULL,

      name TEXT,
      symbol TEXT,
      description TEXT,

      image_url TEXT,
      metadata_uri TEXT,

      pet_type TEXT,
      mood TEXT,
      energy TEXT,

      pulse_rate DOUBLE PRECISION,
      breathing_rate DOUBLE PRECISION,

      transaction_signature TEXT,
      network TEXT DEFAULT 'devnet',

      is_shared BOOLEAN DEFAULT FALSE,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Handles tables created before is_shared was added
  await pool.query(`
    ALTER TABLE nft_gallery
    ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE
  `);
}

// ---------------------------------------------------------
// GET
// Returns all NFTs
//
// GET /api/nft-gallery
// GET /api/nft-gallery?wallet=ABC123
// ---------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await ensureTable();

    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    let result;

    if (wallet) {
      result = await pool.query(
        `
        SELECT *
        FROM nft_gallery
        WHERE owner_wallet = $1
        ORDER BY created_at DESC
        `,
        [wallet]
      );
    } else {
      result = await pool.query(`
        SELECT *
        FROM nft_gallery
        ORDER BY created_at DESC
      `);
    }

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      nfts: result.rows,
    });
  } catch (error) {
    console.error("GET /api/nft-gallery error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      {
        status: 500,
      }
    );
  }
}

// ---------------------------------------------------------
// POST
// Creates or updates an NFT
// ---------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await ensureTable();

    const body = await req.json();

    const {
      mintAddress,
      ownerWallet,
      name,
      symbol,
      description,
      imageUrl,
      metadataUri,
      petType,
      mood,
      energy,
      pulseRate,
      breathingRate,
      transactionSignature,
      network = "devnet",
    } = body;

    // -----------------------------------------------------
    // Validation
    // -----------------------------------------------------

    if (!mintAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "mintAddress is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!ownerWallet) {
      return NextResponse.json(
        {
          success: false,
          error: "ownerWallet is required",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------------------
    // Insert / update NFT
    // -----------------------------------------------------

    const result = await pool.query(
      `
      INSERT INTO nft_gallery (
        mint_address,
        owner_wallet,
        name,
        symbol,
        description,
        image_url,
        metadata_uri,
        pet_type,
        mood,
        energy,
        pulse_rate,
        breathing_rate,
        transaction_signature,
        network
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14
      )

      ON CONFLICT (mint_address)

      DO UPDATE SET
        owner_wallet = EXCLUDED.owner_wallet,
        name = EXCLUDED.name,
        symbol = EXCLUDED.symbol,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        metadata_uri = EXCLUDED.metadata_uri,
        pet_type = EXCLUDED.pet_type,
        mood = EXCLUDED.mood,
        energy = EXCLUDED.energy,
        pulse_rate = EXCLUDED.pulse_rate,
        breathing_rate = EXCLUDED.breathing_rate,
        transaction_signature = EXCLUDED.transaction_signature,
        network = EXCLUDED.network,
        updated_at = NOW()

      RETURNING *
      `,
      [
        mintAddress,
        ownerWallet,
        name ?? null,
        symbol ?? null,
        description ?? null,
        imageUrl ?? null,
        metadataUri ?? null,
        petType ?? null,
        mood ?? null,
        energy ?? null,
        pulseRate ?? null,
        breathingRate ?? null,
        transactionSignature ?? null,
        network,
      ]
    );

    // -----------------------------------------------------
    // Success
    // -----------------------------------------------------

    return NextResponse.json({
      success: true,
      message: "NFT saved to Snowflake Postgres",
      nft: result.rows[0],
    });
  } catch (error) {
    console.error("POST /api/nft-gallery error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      {
        status: 500,
      }
    );
  }
}