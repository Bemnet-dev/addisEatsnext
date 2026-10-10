export function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")            
    .replace(/[^\w\s-]/g, "")        
    .replace(/\s+/g, "-")           
    .replace(/-+/g, "-")            
    .replace(/^-|-$/g, "");         
}