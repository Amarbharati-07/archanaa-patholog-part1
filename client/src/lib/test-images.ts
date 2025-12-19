const categoryImageMap: Record<string, string> = {
  "hematology": "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop",
  "diabetes": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=300&fit=crop",
  "liver profile": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=300&fit=crop",
  "kidney profile": "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400&h=300&fit=crop",
  "lipid profile": "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=400&h=300&fit=crop",
  "thyroid": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&h=300&fit=crop",
  "vitamins": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop",
  "cardiac": "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=400&h=300&fit=crop",
  "infection": "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=400&h=300&fit=crop",
  "serology": "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=300&fit=crop",
  "hormones": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "urine": "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop",
  "stool": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "special": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "special tests": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "allergy": "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=400&h=300&fit=crop",
  "cancer markers": "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=300&fit=crop",
  "fertility": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "bone profile": "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400&h=300&fit=crop",
  "immunology": "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=400&h=300&fit=crop",
  "blood": "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop",
  "general": "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop",
};

const packageCategoryImageMap: Record<string, string> = {
  "men": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
  "women": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=300&fit=crop",
  "general": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop",
  "senior": "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=400&h=300&fit=crop",
  "cardiac": "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=400&h=300&fit=crop",
  "diabetes": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=300&fit=crop",
  "full body": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop",
  "full-body": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop",
  "fullbody": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop",
  "basic": "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop",
  "comprehensive": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop",
  "executive": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop",
  "wellness": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop",
  "fever": "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=400&h=300&fit=crop",
  "child": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "youth": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
  "young": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
  "vitamins": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop",
  "bone-health": "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400&h=300&fit=crop",
  "bone health": "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400&h=300&fit=crop",
  "pcod": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "pcos": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "hormone": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
  "hormones": "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=300&fit=crop",
};

const defaultTestImage = "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop";
const defaultPackageImage = "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop";

export function getTestImage(category: string, imageUrl?: string | null): string {
  if (imageUrl) return imageUrl;
  const normalizedCategory = category?.trim().toLowerCase() || "";
  return categoryImageMap[normalizedCategory] || defaultTestImage;
}

export function getPackageImage(category: string, imageUrl?: string | null): string {
  if (imageUrl) return imageUrl;
  const normalizedCategory = category?.trim().toLowerCase() || "";
  return packageCategoryImageMap[normalizedCategory] || defaultPackageImage;
}

export { categoryImageMap, packageCategoryImageMap, defaultTestImage, defaultPackageImage };
