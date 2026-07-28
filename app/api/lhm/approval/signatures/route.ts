import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EXTERNAL_API_BASE = BACKEND_URL;

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromCookie();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token found. Please login again.', data: {} },
        { status: 401 }
      );
    }

    const searchParams = applyUserDataScope(req, new URLSearchParams(req.nextUrl.searchParams));
    const fcba = searchParams.get('fcba') || '';
    const afdeling = searchParams.get('afdeling') || '';
    const kemandoran = searchParams.get('kemandoran') || '';

    if (!fcba || !afdeling || !kemandoran) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required parameters: fcba, afdeling, kemandoran',
          data: {},
        },
        { status: 400 }
      );
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Helper function to fetch user by level
    const fetchUserByLevel = async (
      level: string,
      includeGangcode: boolean = true
    ): Promise<string> => {
      const url = new URL(`${EXTERNAL_API_BASE}/api/master/sips-users`);
      url.searchParams.append('fcba', fcba);
      url.searchParams.append('afdeling', afdeling);
      url.searchParams.append('level', level);
      if (includeGangcode) {
        url.searchParams.append('gangcode', kemandoran);
      }

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (!response.ok) return '-';

        const data = await response.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          return data.data[0].fullname || '-';
        }
        return '-';
      } catch {
        return '-';
      }
    };

    // Fetch all signatures in parallel
    const [mandorPanen, keraniPanen, keraniTransport, mandor1, asistenAfdeling, keraniAfdeling] =
      await Promise.all([
        fetchUserByLevel('MDP'), // Mandor Panen: fcba, afdeling, gangcode, level = MDP
        fetchUserByLevel('KRP'), // Kerani Panen: fcba, afdeling, gangcode, level = KRP
        fetchUserByLevel('KRT', false), // Kerani Transport: fcba, afdeling, gangcode, level = KRT
        fetchUserByLevel('MD1', false), // Mandor I: fcba, afdeling, gangcode, level = MD1
        fetchUserByLevel('AST', false), // Asisten Afdeling: fcba, afdeling, level = AST (no gangcode)
        fetchUserByLevel('KRA', false), // Kerani Afdeling: fcba, afdeling, level = KRA (no gangcode)
      ]);

    return NextResponse.json({
      success: true,
      message: 'Signatures fetched successfully',
      data: {
        mandorPanen,
        keraniPanen,
        keraniTransport,
        mandor1,
        asistenAfdeling,
        keraniAfdeling,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Signatures fetch crash:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch signatures', data: {} },
      { status: 500 }
    );
  }
}

