import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function checkAuth() {
  const cookieStore = await cookies();
  return cookieStore.get("admin-auth")?.value === "authenticated";
}

export async function POST(request: Request) {
  try {
    const authenticated = await checkAuth();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string || "projects"; // projects, blogs, or zips
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${originalName}`;
    
    // Determine upload directory
    let uploadDir = "projects";
    if (type === "blogs") uploadDir = "blogs";
    else if (type === "zips") uploadDir = "zips";
    
    const uploadPath = path.join(process.cwd(), "public", "uploads", uploadDir);
    
    // Create directory if it doesn't exist
    await mkdir(uploadPath, { recursive: true });
    
    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadPath, filename);
    await writeFile(filePath, buffer);
    
    // Return public URL
    const publicUrl = `/uploads/${uploadDir}/${filename}`;
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      filename: originalName 
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
