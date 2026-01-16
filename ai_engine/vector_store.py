"""
Vector Store for Email Templates using Pinecone
Stores email templates with embeddings for semantic search
"""

import os
import json
from typing import List, Dict, Optional
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

class EmailTemplateStore:
    def __init__(self):
        """Initialize Pinecone and embedding model"""
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index_name = "email-templates"
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')  # Fast, lightweight
        
        # Create index if it doesn't exist
        self._init_index()
        self.index = self.pc.Index(self.index_name)
    
    def _init_index(self):
        """Create Pinecone index if it doesn't exist"""
        existing_indexes = [index.name for index in self.pc.list_indexes()]
        
        if self.index_name not in existing_indexes:
            print(f"Creating Pinecone index: {self.index_name}")
            self.pc.create_index(
                name=self.index_name,
                dimension=384,  # all-MiniLM-L6-v2 embedding size
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region='us-east-1'
                )
            )
            print(f"✓ Index '{self.index_name}' created")
        else:
            print(f"✓ Using existing index: {self.index_name}")
    
    def add_template(self, template: Dict) -> str:
        """
        Add a single email template to the vector store
        
        Args:
            template: Dict with keys: id, subject, body, category, tone, variables
        
        Returns:
            template_id
        """
        # Create searchable text from template
        searchable_text = f"{template['subject']} {template['body']} {template.get('category', '')} {template.get('tone', '')}"
        
        # Generate embedding
        embedding = self.embedding_model.encode(searchable_text).tolist()
        
        # Prepare metadata (Pinecone has size limits, so we store minimal data)
        metadata = {
            "subject": template["subject"][:500],  # Truncate if too long
            "category": template.get("category", "general"),
            "tone": template.get("tone", "professional"),
            "body_preview": template["body"][:200]
        }
        
        # Upsert to Pinecone
        self.index.upsert(vectors=[(template["id"], embedding, metadata)])
        
        return template["id"]
    
    def add_templates_bulk(self, templates: List[Dict]) -> int:
        """
        Add multiple templates in bulk
        
        Returns:
            Number of templates added
        """
        vectors = []
        
        for template in templates:
            searchable_text = f"{template['subject']} {template['body']} {template.get('category', '')} {template.get('tone', '')}"
            embedding = self.embedding_model.encode(searchable_text).tolist()
            
            metadata = {
                "subject": template["subject"][:500],
                "category": template.get("category", "general"),
                "tone": template.get("tone", "professional"),
                "body_preview": template["body"][:200]
            }
            
            vectors.append((template["id"], embedding, metadata))
        
        # Upsert in batches of 100
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i+batch_size]
            self.index.upsert(vectors=batch)
        
        print(f"✓ Added {len(templates)} templates to Pinecone")
        return len(templates)
    
    def search_similar(self, query: str, top_k: int = 3, category_filter: Optional[str] = None) -> List[Dict]:
        """
        Search for similar email templates
        
        Args:
            query: Search query (e.g., dossier summary or pain points)
            top_k: Number of results to return
            category_filter: Optional category filter
        
        Returns:
            List of matching templates with scores
        """
        # Generate query embedding
        query_embedding = self.embedding_model.encode(query).tolist()
        
        # Build filter
        filter_dict = {}
        if category_filter:
            filter_dict["category"] = category_filter
        
        # Search Pinecone
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict if filter_dict else None
        )
        
        # Format results
        matches = []
        for match in results.matches:
            matches.append({
                "id": match.id,
                "score": match.score,
                "subject": match.metadata.get("subject"),
                "category": match.metadata.get("category"),
                "tone": match.metadata.get("tone"),
                "body_preview": match.metadata.get("body_preview")
            })
        
        return matches
    
    def get_template_by_id(self, template_id: str) -> Optional[Dict]:
        """
        Get full template by ID from local JSON
        (Pinecone only stores metadata, full template in JSON)
        """
        try:
            with open("email_templates.json", "r", encoding="utf-8") as f:
                templates = json.load(f)
                for template in templates:
                    if template["id"] == template_id:
                        return template
        except FileNotFoundError:
            print("email_templates.json not found")
        
        return None
    
    def delete_template(self, template_id: str):
        """Delete a template from Pinecone"""
        self.index.delete(ids=[template_id])
        print(f"✓ Deleted template: {template_id}")
    
    def get_stats(self) -> Dict:
        """Get index statistics"""
        stats = self.index.describe_index_stats()
        return {
            "total_vectors": stats.total_vector_count,
            "dimension": stats.dimension
        }


def seed_templates():
    """Seed the vector store with default templates"""
    store = EmailTemplateStore()
    
    # Load templates from JSON
    with open("email_templates.json", "r", encoding="utf-8") as f:
        templates = json.load(f)
    
    # Add to Pinecone
    count = store.add_templates_bulk(templates)
    
    print(f"\n✓ Seeded {count} email templates to Pinecone")
    print(f"✓ Index stats: {store.get_stats()}")


if __name__ == "__main__":
    # Test the vector store
    print("Initializing Email Template Store...")
    seed_templates()
    
    # Test search
    store = EmailTemplateStore()
    results = store.search_similar(
        query="AI startup struggling with lead generation and sales pipeline",
        top_k=3
    )
    
    print("\nTop 3 matching templates:")
    for i, result in enumerate(results, 1):
        print(f"\n{i}. {result['subject']} (score: {result['score']:.3f})")
        print(f"   Category: {result['category']}, Tone: {result['tone']}")
        print(f"   Preview: {result['body_preview'][:100]}...")
