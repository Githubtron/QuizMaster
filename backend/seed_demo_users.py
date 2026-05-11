import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.security import hash_password
from models.user import User

async def seed():
    async with AsyncSessionLocal() as db:
        users = [
            {
                "email": "admin@demo.com",
                "password_hash": hash_password("admin1234"),
                "full_name": "Demo Admin",
                "role": "ADMIN",
            },
            {
                "email": "professor@demo.com",
                "password_hash": hash_password("prof1234"),
                "full_name": "Demo Professor",
                "role": "PROFESSOR",
            },
            {
                "email": "student@demo.com",
                "password_hash": hash_password("student1234"),
                "full_name": "Demo Student",
                "role": "STUDENT",
            }
        ]
        
        for u in users:
            result = await db.execute(select(User).where(User.email == u["email"]))
            existing = result.scalars().first()
            if not existing:
                new_user = User(**u)
                db.add(new_user)
                print(f"Created user: {u['email']}")
            else:
                print(f"User {u['email']} already exists")
                
        await db.commit()

if __name__ == "__main__":
    asyncio.run(seed())
