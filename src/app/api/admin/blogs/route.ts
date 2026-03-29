import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function checkAuth() {
  const cookieStore = await cookies();
  return cookieStore.get("admin-auth")?.value === "authenticated";
}

// Get all blogs (including unpublished)
export async function GET() {
  try {
    const authenticated = await checkAuth();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const blogs = await db.blog.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json({ error: "Failed to fetch blogs" }, { status: 500 });
  }
}

// Create a new blog
export async function POST(request: Request) {
  try {
    const authenticated = await checkAuth();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await request.json();
    
    const blog = await db.blog.create({
      data: {
        title: data.title,
        slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        excerpt: data.excerpt,
        content: data.content || "",
        imageUrl: data.imageUrl,
        tags: JSON.stringify(data.tags || []),
        published: data.published || false,
      },
    });
    
    return NextResponse.json(blog);
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json({ error: "Failed to create blog" }, { status: 500 });
  }
}
