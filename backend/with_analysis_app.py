from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
import pandas as pd
import os
from dotenv import load_dotenv
from io import BytesIO
from bson import ObjectId
from datetime import datetime
import json
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)
CORS(app)

# ---------------- DB CONNECTION ----------------
MONGO_URI = os.environ.get("MONGO_URI")
client = MongoClient(MONGO_URI)

db = client["contractor_db"]
collection = db["contractors"]
files_collection = db["files"]
users_collection = db["users"]
file_access_collection = db["file_access"]
delete_requests_collection = db["delete_requests"]
access_requests_collection = db["access_requests"]
download_requests_collection = db["download_requests"]
download_access_collection = db["download_access"]
archives_collection = db["archives"]
billing_status_collection = db["billing_status"]

# Seed billing status if empty from local Excel
def seed_billing_data():
    try:
        if billing_status_collection.count_documents({}) == 0:
            excel_path = "../Billing Status_11022026.xlsx"
            if not os.path.exists(excel_path):
                excel_path = "Billing Status_11022026.xlsx"
            if os.path.exists(excel_path):
                print("Seeding billing status database from Excel...")
                if excel_path.endswith(".csv"):
                    df = pd.read_csv(excel_path)
                else:
                    df = pd.read_excel(excel_path)
                
                df.columns = [str(col).replace(".", "_").replace("$", "_") for col in df.columns]
                df = df.fillna("")
                records = json.loads(df.to_json(orient="records", date_format="iso"))
                if records:
                    billing_status_collection.insert_many(records)
                    print(f"Successfully seeded {len(records)} billing records!")
            else:
                print("Billing Status Excel file not found. Skipping auto-seed.")
    except Exception as e:
        print("Error seeding billing status:", e)

seed_billing_data()
SUPER_ADMIN_EMAILS = ["nidhims202006@gmail.com","sidadmin@gmail.com"]#password is passadmin
ADMIN_EMAILS = [""] # Existing hardcoded admins if any, or just move to DB
# ---------------- HEALTH CHECK ----------------
@app.route("/")
def home():
    return "Backend running ✅"

# ---------------- AUTHENTICATION ----------------
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.json
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")

        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password required"}), 400

        if users_collection.find_one({"$or": [{"username": username}, {"email": email}]}):
            return jsonify({"error": "User with this username or email already exists"}), 400

        if email in SUPER_ADMIN_EMAILS:
            role = "super_admin"
        elif email in ADMIN_EMAILS:
            role = "admin"
        else:
            role = "user"
        
        hashed_pw = generate_password_hash(password)
        users_collection.insert_one({
            "username": username,
            "email": email,
            "password": hashed_pw,
            "role": role
        })

        return jsonify({"msg": "User created successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        login_id = data.get("username") # Frontend sends login ID as "username"
        password = data.get("password")

        user = users_collection.find_one({"$or": [{"username": login_id}, {"email": login_id}]})
        if not user or not check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid credentials"}), 401
            
        if user.get("email") in SUPER_ADMIN_EMAILS:
            if user.get("role") != "super_admin":
                users_collection.update_one({"_id": user["_id"]}, {"$set": {"role": "super_admin"}})
                user["role"] = "super_admin"
        elif user.get("email") in ADMIN_EMAILS:
            if user.get("role") != "admin":
                users_collection.update_one({"_id": user["_id"]}, {"$set": {"role": "admin"}})
                user["role"] = "admin"

        return jsonify({
            "msg": "Login successful",
            "user": {
                "id": str(user.get("_id")),
                "username": user.get("username"),
                "email": user.get("email", ""),
                "name": user.get("name", ""),
                "profile_image": user.get("profile_image", ""),
                "role": user.get("role", "user")
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/google-login", methods=["POST"])
def google_login():
    try:
        data = request.json
        email = data.get("email")
        name = data.get("name")
        picture = data.get("picture")

        if not email:
            return jsonify({"error": "Email is required"}), 400

        user = users_collection.find_one({"email": email})
        
        if not user:
            # Create a new user if one doesn't exist
            if email in SUPER_ADMIN_EMAILS:
                role = "super_admin"
            elif email in ADMIN_EMAILS:
                role = "admin"
            else:
                role = "user"
            
            new_user = {
                "email": email,
                "name": name,
                "profile_image": picture,
                "auth_provider": "google",
                "username": email.split('@')[0], # fallback username
                "role": role
            }
            insert_res = users_collection.insert_one(new_user)
            new_user["_id"] = insert_res.inserted_id
            user = new_user
        else:
            # Update existing user
            if email in SUPER_ADMIN_EMAILS:
                role = "super_admin"
            elif email in ADMIN_EMAILS:
                role = "admin"
            else:
                role = user.get("role", "user")
                
            users_collection.update_one(
                {"email": email},
                {"$set": {"name": name, "profile_image": picture, "role": role}}
            )
            user["name"] = name
            user["profile_image"] = picture
            user["role"] = role

        return jsonify({
            "msg": "Google login successful",
            "user": {
                "id": str(user.get("_id")),
                "email": user.get("email"),
                "name": user.get("name"),
                "username": user.get("username"),
                "profile_image": user.get("profile_image"),
                "role": user.get("role", "user")
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- GET FILES ----------------
@app.route("/files", methods=["GET"])
def get_files():
    try:
        user_id = request.args.get("user_id")
        user_role = request.args.get("role", "user")
        print(f"DEBUG: get_files called for user_id={user_id}, role={user_role}")

        all_files = list(files_collection.find({}))
            
        for f in all_files:
            f["_id"] = str(f["_id"])
            if isinstance(f.get("uploaded_at"), datetime):
                f["uploaded_at"] = f["uploaded_at"].strftime("%Y-%m-%d %H:%M:%S")
                
            # Assign permission flag and has_access status
            if user_role in ["admin", "super_admin"] or f.get("uploaded_by") == user_id:
                f["permission"] = "edit"
                f["has_access"] = True
                f["can_download"] = True
            else:
                acc = file_access_collection.find_one({"file_id": f["_id"], "user_id": user_id})
                if acc:
                    f["permission"] = acc.get("permission", "view")
                    f["has_access"] = True
                else:
                    f["permission"] = None
                    f["has_access"] = False
                    # Check if there is a pending or rejected request (Latest one)
                    req = access_requests_collection.find_one(
                        {"file_id": f["_id"], "user_id": user_id, "status": {"$in": ["pending", "rejected"]}},
                        sort=[("requested_at", -1)]
                    )
                    if req:
                        f["request_pending"] = (req["status"] == "pending")
                        # Only show as rejected if it's NOT dismissed (one-time highlight)
                        f["request_rejected"] = (req["status"] == "rejected" and not req.get("dismissed", False))
                        f["rejection_reason"] = req.get("rejection_reason", "")
                    else:
                        f["request_pending"] = False
                        f["request_rejected"] = False
                
                # Check download access
                if user_role in ["admin", "super_admin"]:
                    f["can_download"] = True
                else:
                    dl_acc = download_access_collection.find_one({"file_id": f["_id"], "user_id": user_id})
                    if dl_acc:
                        f["can_download"] = True
                    else:
                        f["can_download"] = False
                        dl_req = download_requests_collection.find_one({"file_id": f["_id"], "user_id": user_id, "status": "pending"})
                        f["download_request_pending"] = True if dl_req else False
                
            # Assign pin status
            pinned_by = f.get("pinned_by", [])
            f["pinned"] = user_id in pinned_by

        # print(f"DEBUG: Returning {len(all_files)} files. Access summary: {[ (f['filename'], f['has_access']) for f in all_files ]}")
        return jsonify(all_files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- UPLOAD FILE ----------------
@app.route("/upload", methods=["POST"])
def upload():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        save_to_db = request.form.get("save") == "true"
        user_id = request.form.get("user_id")
        uploader_email = request.form.get("uploader_email", "Unknown")

        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400

        # Read file
        try:
            if file.filename.endswith(".csv"):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
        except Exception as e:
            print(f"ERROR reading file: {str(e)}")
            return jsonify({"error": f"Failed to read file: {str(e)}"}), 400

        # Sanitize columns for MongoDB (no . or $)
        original_columns = list(df.columns)
        sanitized_columns = []
        for col in original_columns:
            # Convert to string, replace . and $
            new_col = str(col).replace(".", "_").replace("$", "_")
            # Avoid empty column names
            if not new_col.strip():
                new_col = f"unnamed_column_{len(sanitized_columns)}"
            sanitized_columns.append(new_col)
        
        df.columns = sanitized_columns

        # Convert to dict safely handling numpy types
        df = df.fillna("")
        try:
            data = json.loads(df.to_json(orient="records", date_format="iso"))
        except Exception as e:
            print(f"ERROR converting to JSON: {str(e)}")
            return jsonify({"error": f"Failed to process data format: {str(e)}"}), 400

        if save_to_db:
            # Create file document
            columns = sanitized_columns
            file_doc = {
                "filename": file.filename,
                "uploaded_at": datetime.now(),
                "columns": columns,
                "uploaded_by": user_id,
                "uploader_email": uploader_email
            }
            try:
                file_result = files_collection.insert_one(file_doc)
                file_id = str(file_result.inserted_id)
            except Exception as e:
                print(f"ERROR inserting file doc: {str(e)}")
                return jsonify({"error": f"Database error (file metadata): {str(e)}"}), 500

            if len(data) > 0:
                try:
                    for row in data:
                        row["file_id"] = file_id
                    collection.insert_many(data)
                except Exception as e:
                    print(f"ERROR inserting data rows: {str(e)}")
                    # Clean up the file doc if data insertion fails
                    files_collection.delete_one({"_id": ObjectId(file_id)})
                    return jsonify({"error": f"Database error (file data): {str(e)}"}), 500

            # Convert ObjectIds to strings for returning
            for row in data:
                row["_id"] = str(row["_id"])
            
            return jsonify({"msg": "File saved successfully", "file_id": file_id, "data": data, "columns": columns})
        else:
            # Generate temporary IDs for frontend editing
            for row in data:
                row["_id"] = "temp_" + str(ObjectId())
            return jsonify({"msg": "File parsed successfully", "file_id": None, "data": data, "columns": list(df.columns)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- ADMIN/USERS ----------------
@app.route("/users", methods=["GET"])
def get_users():
    try:
        users = list(users_collection.find({}, {"password": 0}))
        for u in users:
            user_id = str(u["_id"])
            u["_id"] = user_id
            
            # Count accesses
            if u.get("role") in ["admin", "super_admin"]:
                # Admin has access to all files
                all_files_count = files_collection.count_documents({})
                u["view_count"] = all_files_count
                u["edit_count"] = all_files_count
                u["is_privileged"] = True
            else:
                u["view_count"] = file_access_collection.count_documents({"user_id": user_id, "permission": "view"})
                u["edit_count"] = file_access_collection.count_documents({"user_id": user_id, "permission": "edit"})
                u["is_privileged"] = False
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    """Delete a user and clean up all their related access records."""
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Prevent deleting admin users
        if user.get("role") in ["admin", "super_admin"]:
            return jsonify({"error": "Cannot delete admin users"}), 403

        # Clean up all related records
        file_access_collection.delete_many({"user_id": user_id})
        access_requests_collection.delete_many({"user_id": user_id})
        download_requests_collection.delete_many({"user_id": user_id})
        download_access_collection.delete_many({"user_id": user_id})
        delete_requests_collection.delete_many({"user_email": user.get("email")})

        # Delete the user
        users_collection.delete_one({"_id": ObjectId(user_id)})

        return jsonify({"msg": "User deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/access", methods=["POST"])
def grant_access():
    try:
        data = request.json
        user_ids = data.get("user_ids")
        user_id = data.get("user_id")
        file_id = data.get("file_id")
        permission = data.get("permission", "view")

        if not file_id:
            return jsonify({"error": "Missing file_id"}), 400

        # Handle both list and single ID
        ids_to_process = user_ids if user_ids and isinstance(user_ids, list) else ([user_id] if user_id else [])
        
        if not ids_to_process:
            return jsonify({"error": "Missing user_ids or user_id"}), 400

        count = 0
        for uid in ids_to_process:
            file_access_collection.update_one(
                {"user_id": uid, "file_id": file_id},
                {"$set": {"permission": permission}},
                upsert=True
            )
            count += 1
            
        return jsonify({"msg": f"Access updated for {count} users"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/access", methods=["DELETE"])
def revoke_access():
    try:
        data = request.json
        user_ids = data.get("user_ids")
        user_id = data.get("user_id")
        file_id = data.get("file_id")
        
        if not file_id:
            return jsonify({"error": "Missing file_id"}), 400

        ids_to_process = user_ids if user_ids and isinstance(user_ids, list) else ([user_id] if user_id else [])
        
        if not ids_to_process:
            return jsonify({"error": "Missing user_ids or user_id"}), 400

        file_access_collection.delete_many({"user_id": {"$in": ids_to_process}, "file_id": file_id})
        return jsonify({"msg": f"Access revoked for {len(ids_to_process)} users"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/access/all", methods=["POST"])
def grant_access_all():
    try:
        data = request.json
        file_id = data.get("file_id")
        permission = data.get("permission", "view")

        if not file_id:
            return jsonify({"error": "Missing file_id"}), 400

        # Get all non-privileged users (for default access granting)
        all_users = list(users_collection.find({"role": {"$nin": ["admin", "super_admin"]}}))
        
        count = 0
        for user in all_users:
            user_id = str(user["_id"])
            # Check if user already has access
            existing = file_access_collection.find_one({"user_id": user_id, "file_id": file_id})
            
            if not existing:
                file_access_collection.insert_one({
                    "user_id": user_id,
                    "file_id": file_id,
                    "permission": permission
                })
                count += 1
        
        return jsonify({"msg": f"Access granted to {count} new users."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/users/toggle_role", methods=["POST"])
def toggle_user_role():
    try:
        data = request.json
        user_id = data.get("user_id")
        new_role = data.get("role") # "admin" or "user"
        caller_role = data.get("caller_role")

        if caller_role != "super_admin":
            return jsonify({"error": "Only super admins can change user roles"}), 403

        if not user_id or not new_role:
            return jsonify({"error": "Missing user_id or role"}), 400

        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.get("email") in SUPER_ADMIN_EMAILS:
            return jsonify({"error": "Cannot change role of a super admin"}), 403

        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": new_role}})
        return jsonify({"msg": f"User role updated to {new_role}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/access/<file_id>", methods=["GET"])
def get_file_access(file_id):
    try:
        access_docs = list(file_access_collection.find({"file_id": file_id}))
        for doc in access_docs:
            doc["_id"] = str(doc["_id"])
        return jsonify(access_docs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/user/access/<user_id>", methods=["GET"])
def get_user_access(user_id):
    """Get all files a specific user has access to (for admin user management)."""
    try:
        print(f"DEBUG: Fetching access for user_id={user_id} (type={type(user_id)})")
        access_docs = list(file_access_collection.find({"user_id": user_id}))
        result = []
        for doc in access_docs:
            doc["_id"] = str(doc["_id"])
            # Enrich with file metadata
            try:
                file_obj = files_collection.find_one({"_id": ObjectId(doc["file_id"])})
                doc["filename"] = file_obj["filename"] if file_obj else "Unknown File"
            except Exception:
                doc["filename"] = "Unknown File"
            result.append(doc)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- DELETE FILE ----------------
@app.route("/delete_file", methods=["POST"])
def delete_file():
    """Move a file to archives instead of permanent deletion."""
    try:
        payload = request.json
        if not payload.get("id"):
            return jsonify({"error": "Missing ID"}), 400
        
        file_id = payload["id"]
        file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
        
        if not file_doc:
            return jsonify({"error": "File not found"}), 404
            
        # Add archived_at timestamp
        file_doc["archived_at"] = datetime.now()
        
        # Move to archives
        archives_collection.insert_one(file_doc)
        
        # Remove from files_collection
        files_collection.delete_one({"_id": ObjectId(file_id)})
        
        return jsonify({"msg": "File moved to archives"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/archives", methods=["GET"])
def get_archives():
    try:
        archived_files = list(archives_collection.find({}))
        for f in archived_files:
            f["_id"] = str(f["_id"])
            if isinstance(f.get("archived_at"), datetime):
                f["archived_at"] = f["archived_at"].strftime("%Y-%m-%d %H:%M:%S")
            if isinstance(f.get("uploaded_at"), datetime):
                f["uploaded_at"] = f["uploaded_at"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(archived_files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/archives/restore", methods=["POST"])
def restore_file():
    try:
        file_id = request.json.get("id")
        if not file_id:
            return jsonify({"error": "Missing ID"}), 400
            
        file_doc = archives_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            return jsonify({"error": "File not found in archives"}), 404
            
        # Remove archive-specific fields if any
        file_doc.pop("archived_at", None)
        
        # Move back to files_collection
        files_collection.insert_one(file_doc)
        
        # Remove from archives
        archives_collection.delete_one({"_id": ObjectId(file_id)})
        
        return jsonify({"msg": "File restored successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/archives/permanent", methods=["DELETE"])
def permanent_delete():
    try:
        file_id = request.json.get("id")
        if not file_id:
            return jsonify({"error": "Missing ID"}), 400
            
        # Delete from archives
        archives_collection.delete_one({"_id": ObjectId(file_id)})
        # Delete associated data
        collection.delete_many({"file_id": file_id})
        
        return jsonify({"msg": "File and data permanently deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/toggle_pin", methods=["POST"])
def toggle_pin():
    try:
        data = request.json
        file_id = data.get("file_id")
        user_id = data.get("user_id")
        
        if not file_id or not user_id:
            return jsonify({"error": "Missing file_id or user_id"}), 400
            
        file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            return jsonify({"error": "File not found"}), 404
            
        pinned_by = file_doc.get("pinned_by", [])
        if user_id in pinned_by:
            pinned_by.remove(user_id)
            msg = "File unpinned"
        else:
            pinned_by.append(user_id)
            msg = "File pinned"
            
        files_collection.update_one({"_id": ObjectId(file_id)}, {"$set": {"pinned_by": pinned_by}})
        return jsonify({"msg": msg})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- DELETE REQUESTS ----------------
@app.route("/file/delete_request", methods=["POST"])
def request_delete():
    try:
        data = request.json
        file_id = data.get("file_id")
        user_email = data.get("user_email")
        
        if not file_id or not user_email:
            return jsonify({"error": "Missing file_id or user_email"}), 400
            
        file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            return jsonify({"error": "File not found"}), 404
            
        delete_requests_collection.insert_one({
            "file_id": file_id,
            "filename": file_doc.get("filename"),
            "user_email": user_email,
            "status": "pending",
            "requested_at": datetime.now()
        })
        return jsonify({"msg": "Delete request submitted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/delete_requests", methods=["GET"])
def get_delete_requests():
    try:
        reqs = list(delete_requests_collection.find({"status": "pending"}))
        for r in reqs:
            r["_id"] = str(r["_id"])
            if isinstance(r.get("requested_at"), datetime):
                r["requested_at"] = r["requested_at"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(reqs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/delete_request/approve", methods=["POST"])
def approve_delete_request():
    try:
        req_id = request.json.get("request_id")
        if not req_id:
            return jsonify({"error": "Missing request_id"}), 400
            
        req_doc = delete_requests_collection.find_one({"_id": ObjectId(req_id)})
        if not req_doc:
            return jsonify({"error": "Request not found"}), 404
            
        file_id = req_doc["file_id"]
        # Delete file logic
        files_collection.delete_one({"_id": ObjectId(file_id)})
        collection.delete_many({"file_id": file_id})
        # Remove request
        delete_requests_collection.delete_one({"_id": ObjectId(req_id)})
        return jsonify({"msg": "File deleted and request approved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/delete_request/reject", methods=["POST"])
def reject_delete_request():
    try:
        req_id = request.json.get("request_id")
        if not req_id:
            return jsonify({"error": "Missing request_id"}), 400
            
        delete_requests_collection.delete_one({"_id": ObjectId(req_id)})
        return jsonify({"msg": f"Request {action}ed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/access_requests/approve_all", methods=["POST"])
def approve_all_access_requests():
    try:
        data = request.json
        permission = data.get("permission", "view")
        
        pending_reqs = list(access_requests_collection.find({"status": "pending"}))
        
        count = 0
        for req in pending_reqs:
            user_id = req.get("user_id")
            file_id = req.get("file_id")
            
            # Grant access
            file_access_collection.update_one(
                {"user_id": user_id, "file_id": file_id},
                {"$set": {"permission": permission}},
                upsert=True
            )
            
            # Mark request as approved
            access_requests_collection.update_one(
                {"_id": req["_id"]},
                {"$set": {"status": "approved", "processed_at": datetime.now()}}
            )
            count += 1
            
        return jsonify({"msg": f"Successfully approved {count} access requests"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- ACCESS REQUESTS ----------------
@app.route("/file/access_request", methods=["POST"])
def request_access():
    try:
        data = request.json
        file_id = data.get("file_id")
        user_id = data.get("user_id")
        user_email = data.get("user_email")
        
        if not file_id or not user_id:
            return jsonify({"error": "Missing file_id or user_id"}), 400
            
        file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            return jsonify({"error": "File not found"}), 404
            
        # Check if request already exists
        if access_requests_collection.find_one({"file_id": file_id, "user_id": user_id, "status": "pending"}):
            return jsonify({"msg": "Request already pending"}), 200

        access_requests_collection.insert_one({
            "file_id": file_id,
            "filename": file_doc.get("filename"),
            "user_id": user_id,
            "user_email": user_email,
            "status": "pending",
            "requested_at": datetime.now()
        })
        return jsonify({"msg": "Access request submitted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/access_requests", methods=["GET"])
def get_access_requests():
    try:
        reqs = list(access_requests_collection.find({"status": "pending"}))
        for r in reqs:
            r["_id"] = str(r["_id"])
            if isinstance(r.get("requested_at"), datetime):
                r["requested_at"] = r["requested_at"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(reqs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/access_request/action", methods=["POST"])
def action_access_request():
    try:
        data = request.json
        req_id = data.get("request_id")
        action = data.get("action") # "approve" or "reject"
        permission = data.get("permission", "view")
        
        if not req_id or not action:
            return jsonify({"error": "Missing request_id or action"}), 400
            
        req_doc = access_requests_collection.find_one({"_id": ObjectId(req_id)})
        if not req_doc:
            return jsonify({"error": "Request not found"}), 404
            
        if action == "approve":
            # Grant access
            file_access_collection.update_one(
                {"user_id": req_doc["user_id"], "file_id": req_doc["file_id"]},
                {"$set": {"permission": permission}},
                upsert=True
            )
            access_requests_collection.update_one({"_id": ObjectId(req_id)}, {"$set": {"status": "approved"}})
            return jsonify({"msg": "Request approved and access granted"})
        else:
            reason = data.get("reason", "")
            access_requests_collection.update_one({"_id": ObjectId(req_id)}, {"$set": {"status": "rejected", "rejection_reason": reason}})
            return jsonify({"msg": "Request rejected"})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- DOWNLOAD REQUESTS ----------------
@app.route("/file/download_request", methods=["POST"])
def request_download():
    try:
        data = request.json
        file_id = data.get("file_id")
        user_id = data.get("user_id")
        user_email = data.get("user_email")
        
        if not file_id or not user_id:
            return jsonify({"error": "Missing file_id or user_id"}), 400
            
        file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            return jsonify({"error": "File not found"}), 404
            
        if download_requests_collection.find_one({"file_id": file_id, "user_id": user_id, "status": "pending"}):
            return jsonify({"msg": "Download request already pending"}), 200

        download_requests_collection.insert_one({
            "file_id": file_id,
            "filename": file_doc.get("filename"),
            "user_id": user_id,
            "user_email": user_email,
            "status": "pending",
            "requested_at": datetime.now()
        })
        return jsonify({"msg": "Download request submitted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/download_requests", methods=["GET"])
def get_download_requests():
    try:
        reqs = list(download_requests_collection.find({"status": "pending"}))
        for r in reqs:
            r["_id"] = str(r["_id"])
            if isinstance(r.get("requested_at"), datetime):
                r["requested_at"] = r["requested_at"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(reqs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/download_request/action", methods=["POST"])
def action_download_request():
    try:
        data = request.json
        req_id = data.get("request_id")
        action = data.get("action") # "approve" or "reject"
        
        if not req_id or not action:
            return jsonify({"error": "Missing request_id or action"}), 400
            
        req_doc = download_requests_collection.find_one({"_id": ObjectId(req_id)})
        if not req_doc:
            return jsonify({"error": "Request not found"}), 404
            
        if action == "approve":
            download_access_collection.update_one(
                {"user_id": req_doc["user_id"], "file_id": req_doc["file_id"]},
                {"$set": {"can_download": True}},
                upsert=True
            )
            download_requests_collection.update_one({"_id": ObjectId(req_id)}, {"$set": {"status": "approved"}})
            return jsonify({"msg": "Download request approved"})
        else:
            download_requests_collection.update_one({"_id": ObjectId(req_id)}, {"$set": {"status": "rejected"}})
            return jsonify({"msg": "Download request rejected"})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- USER NOTIFICATIONS ----------------
@app.route("/file/user_notifications", methods=["GET"])
def get_user_notifications():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
        acc_reqs = list(access_requests_collection.find({"user_id": user_id, "status": "approved", "dismissed": {"$ne": True}}))
        rej_reqs = list(access_requests_collection.find({"user_id": user_id, "status": "rejected", "dismissed": {"$ne": True}}))
        dl_count = download_requests_collection.count_documents({"user_id": user_id, "status": "approved", "dismissed": {"$ne": True}})
        
        acc_data = [{"file_id": str(r["file_id"]), "filename": r.get("filename", "a document")} for r in acc_reqs]
        rej_data = [{"file_id": str(r["file_id"]), "filename": r.get("filename"), "reason": r.get("rejection_reason", "")} for r in rej_reqs]
        
        return jsonify({
            "approved_count": len(acc_reqs) + dl_count,
            "rejected_count": len(rej_reqs),
            "newly_granted_access": acc_data,
            "rejected_requests": rej_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/file/user_notifications/dismiss", methods=["POST"])
def dismiss_user_notifications():
    try:
        user_id = request.json.get("user_id")
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
            
        access_requests_collection.update_many({"user_id": user_id, "status": "approved", "dismissed": {"$ne": True}}, {"$set": {"dismissed": True}})
        access_requests_collection.update_many({"user_id": user_id, "status": "rejected", "dismissed": {"$ne": True}}, {"$set": {"dismissed": True}})
        download_requests_collection.update_many({"user_id": user_id, "status": "approved", "dismissed": {"$ne": True}}, {"$set": {"dismissed": True}})
        
        return jsonify({"msg": "Notifications dismissed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- RENAME FILE ----------------
@app.route("/file/rename", methods=["POST"])
def rename_file():
    try:
        data = request.json
        file_id = data.get("id")
        new_name = data.get("new_name")
        
        if not file_id or not new_name:
            return jsonify({"error": "Missing file_id or new_name"}), 400
            
        files_collection.update_one(
            {"_id": ObjectId(file_id)},
            {"$set": {"filename": new_name}}
        )
        return jsonify({"msg": "File renamed successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- GET DATA ----------------
@app.route("/data/<file_id>", methods=["GET"])
def get_data(file_id):
    try:
        data = list(collection.find({"file_id": file_id}))
        file_doc = files_collection.find_one({"_id": ObjectId(file_id)})
        columns = file_doc.get("columns", []) if file_doc else []

        # Convert ObjectId and datetime to string
        for d in data:
            d["_id"] = str(d["_id"])
            for key, value in d.items():
                if isinstance(value, datetime):
                    d[key] = value.strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({"data": data, "columns": columns})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- UPDATE CELL ----------------
@app.route("/update", methods=["POST"])
def update():
    try:
        payload = request.json
        if not payload.get("id"):
            return jsonify({"error": "Missing ID"}), 400

        collection.update_one(
            {"_id": ObjectId(payload["id"])},
            {"$set": {payload["field"]: payload["value"]}}
        )

        return jsonify({"msg": "Updated successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- UPDATE ROW ----------------
@app.route("/update_row", methods=["POST"])
def update_row():
    try:
        payload = request.json
        if not payload.get("_id"):
            return jsonify({"error": "Missing ID"}), 400

        row_id = payload.pop("_id")
        
        collection.update_one(
            {"_id": ObjectId(row_id)},
            {"$set": payload}
        )

        return jsonify({"msg": "Row updated successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- DELETE ROW ----------------
@app.route("/delete", methods=["POST"])
def delete():
    try:
        payload = request.json
        if not payload.get("id"):
            return jsonify({"error": "Missing ID"}), 400

        collection.delete_one({
            "_id": ObjectId(payload["id"])
        })

        return jsonify({"msg": "Deleted successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- ADD ROW ----------------
@app.route("/add", methods=["POST"])
def add():
    try:
        payload = request.json
        if not payload:
            return jsonify({"error": "Empty row"}), 400

        collection.insert_one(payload)
        payload["_id"] = str(payload["_id"])

        return jsonify({"msg": "Row added successfully", "data": payload})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- DOWNLOAD EXCEL ----------------
@app.route("/download/<file_id>", methods=["GET"])
def download(file_id):
    try:
        data = list(collection.find({"file_id": file_id}, {"_id": 0}))
        df = pd.DataFrame(data)

        output = BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)

        return send_file(
            output,
            download_name="dashboard_data.xlsx",
            as_attachment=True
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- INBOX / MESSAGING SYSTEM ----------------
messages_collection = db["messages"]

@app.route("/messages/send", methods=["POST"])
def send_message():
    try:
        data = request.json
        sender_id = data.get("sender_id")
        recipient_type = data.get("recipient_type") # "global" | "role" | "individual"
        recipient_role = data.get("recipient_role") # "admin" | "super_admin" | "user" (optional)
        recipient_id = data.get("recipient_id") # (optional)
        content = data.get("content")

        if not sender_id or not recipient_type or not content:
            return jsonify({"error": "Missing required fields"}), 400

        sender = users_collection.find_one({"_id": ObjectId(sender_id)})
        if not sender:
            return jsonify({"error": "Sender not found"}), 404

        # Validate that sender is admin or super_admin
        if sender.get("role") not in ["admin", "super_admin"]:
            return jsonify({"error": "Only admins and super admins can send or broadcast messages"}), 403

        recipient_email = ""
        recipient_name = ""
        if recipient_type == "individual" and recipient_id:
            rec = users_collection.find_one({"_id": ObjectId(recipient_id)})
            if rec:
                recipient_email = rec.get("email", "")
                recipient_name = rec.get("name") or rec.get("username", "")

        msg_doc = {
            "sender_id": sender_id,
            "sender_email": sender.get("email", ""),
            "sender_name": sender.get("name") or sender.get("username", ""),
            "sender_role": sender.get("role"),
            "recipient_type": recipient_type,
            "recipient_role": recipient_role,
            "recipient_id": recipient_id,
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "content": content,
            "created_at": datetime.now(),
            "read_by": [sender_id], # Sender has automatically read it
            "replies": []
        }

        result = messages_collection.insert_one(msg_doc)
        msg_doc["_id"] = str(result.inserted_id)
        if isinstance(msg_doc.get("created_at"), datetime):
            msg_doc["created_at"] = msg_doc["created_at"].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({"msg": "Message broadcasted successfully", "data": msg_doc}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/messages", methods=["GET"])
def get_messages():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        role = user.get("role", "user")

        # Query messages:
        # 1. Global messages
        # 2. Messages target to user's role
        # 3. Messages sent directly to user_id
        # 4. Messages sent BY the user
        query = {
            "$or": [
                {"recipient_type": "global"},
                {"$and": [{"recipient_type": "role"}, {"recipient_role": role}]},
                {"$and": [{"recipient_type": "individual"}, {"recipient_id": user_id}]},
                {"sender_id": user_id}
            ]
        }

        messages = list(messages_collection.find(query).sort("created_at", -1))
        
        for m in messages:
            m["_id"] = str(m["_id"])
            if isinstance(m.get("created_at"), datetime):
                m["created_at"] = m["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            for rep in m.get("replies", []):
                if isinstance(rep.get("created_at"), datetime):
                    rep["created_at"] = rep["created_at"].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify(messages), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/messages/reply", methods=["POST"])
def reply_message():
    try:
        data = request.json
        message_id = data.get("message_id")
        sender_id = data.get("sender_id")
        content = data.get("content")

        if not message_id or not sender_id or not content:
            return jsonify({"error": "Missing required fields"}), 400

        sender = users_collection.find_one({"_id": ObjectId(sender_id)})
        if not sender:
            return jsonify({"error": "Sender not found"}), 404

        # Validate that standard users cannot reply
        if sender.get("role") not in ["admin", "super_admin"]:
            return jsonify({"error": "Contractors are read-only and cannot reply to messages"}), 403

        reply_doc = {
            "sender_id": sender_id,
            "sender_email": sender.get("email", ""),
            "sender_name": sender.get("name") or sender.get("username", ""),
            "sender_role": sender.get("role"),
            "content": content,
            "created_at": datetime.now()
        }

        messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$push": {"replies": reply_doc},
                "$set": {"read_by": [sender_id]} # Reset read_by so others see new reply as unread
            }
        )

        reply_doc["created_at"] = reply_doc["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify({"msg": "Reply sent successfully", "reply": reply_doc}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/messages/read", methods=["POST"])
def read_message():
    try:
        data = request.json
        message_id = data.get("message_id")
        user_id = data.get("user_id")

        if not message_id or not user_id:
            return jsonify({"error": "Missing required fields"}), 400

        messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$addToSet": {"read_by": user_id}}
        )

        return jsonify({"msg": "Message marked as read"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper to match company to user
def user_matches_company(user, company_name):
    if not company_name:
        return False
    company_lower = str(company_name).lower().strip()
    
    user_company = user.get("company")
    if user_company and str(user_company).lower().strip() == company_lower:
        return True
        
    user_username = user.get("username")
    if user_username and str(user_username).lower().strip() == company_lower:
        return True
        
    user_email = user.get("email")
    if user_email:
        email_lower = str(user_email).lower().strip()
        if company_lower in email_lower:
            return True
    return False

@app.route("/billing/status", methods=["GET"])
def get_billing_status():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
            
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        role = user.get("role", "user")
        all_records = list(billing_status_collection.find({}))
        
        for doc in all_records:
            doc["_id"] = str(doc["_id"])
            
        if role in ["admin", "super_admin"]:
            return jsonify(all_records)
        else:
            # Contractor scoping: return only matching records
            matched_records = [r for r in all_records if user_matches_company(user, r.get("Company"))]
            return jsonify(matched_records)
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/billing/update", methods=["POST"])
def update_billing_cell():
    try:
        payload = request.json
        row_id = payload.get("id")
        field = payload.get("field")
        value = payload.get("value")
        
        if not row_id or not field:
            return jsonify({"error": "Missing required fields"}), 400
            
        billing_status_collection.update_one(
            {"_id": ObjectId(row_id)},
            {"$set": {field: value}}
        )
        return jsonify({"msg": "Billing cell updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/billing/upload", methods=["POST"])
def upload_billing_sheet():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
            
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400
            
        if file.filename.endswith(".csv"):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
            
        df.columns = [str(col).replace(".", "_").replace("$", "_") for col in df.columns]
        df = df.fillna("")
        records = json.loads(df.to_json(orient="records", date_format="iso"))
        
        if records:
            for record in records:
                query = {}
                if record.get("Efile No"):
                    query = {"Efile No": record["Efile No"]}
                elif record.get("Company"):
                    query = {"Company": record["Company"]}
                else:
                    billing_status_collection.insert_one(record)
                    continue
                
                # Merge the new row, updating existing or inserting if new
                billing_status_collection.update_one(
                    query,
                    {"$set": record},
                    upsert=True
                )
        return jsonify({"msg": "Billing database re-synchronized successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- RUN SERVER ----------------
if __name__ == "__main__":
    app.run(debug=True, use_reloader=True)