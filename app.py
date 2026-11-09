import hashlib
import json
import os
import re
from datetime import datetime
from math import pow

DATA_FILE = "smartbank_data.json"

def now_iso():
    return datetime.now().isoformat()

def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()

def load_data():
    if not os.path.exists(DATA_FILE):
        return {"users": [], "current_user": None, "transactions": {}, "notifications": {}, "applications": {}, "kyc": {}, "balances": {}}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"users": [], "current_user": None, "transactions": {}, "notifications": {}, "applications": {}, "kyc": {}, "balances": {}}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def get_user(data, username):
    for user in data["users"]:
        if user["username"] == username:
            return user
    return None

def current_user(data):
    return data.get("current_user")

def require_login(data):
    if not data.get("current_user"):
        print("\nPlease log in first.\n")
        return False
    return True

def get_bucket(data, key, username):
    bucket = data.get(key, {})
    return bucket.get(username, [])

def set_bucket(data, key, username, value):
    if key not in data:
        data[key] = {}
    data[key][username] = value

def add_transaction(data, username, description, amount, tx_type="Transfer"):
    txs = get_bucket(data, "transactions", username)
    txs.insert(0, {
        "description": description,
        "amount": f"₹{amount:,.2f}",
        "amountValue": amount,
        "type": tx_type,
        "date": now_iso()
    })
    set_bucket(data, "transactions", username, txs)

def add_notification(data, username, text):
    notes = get_bucket(data, "notifications", username)
    notes.insert(0, {"text": text, "date": now_iso()})
    set_bucket(data, "notifications", username, notes)

def balance_for_user(data, username):
    return data.get("balances", {}).get(username, 25000)

def set_balance(data, username, value):
    if "balances" not in data:
        data["balances"] = {}
    data["balances"][username] = value

def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")

def print_header(title):
    print("\n" + "=" * 60)
    print(title.center(60))
    print("=" * 60)

def register_user(data):
    clear_screen()
    print_header("Create Account")
    name = input("Full name: ").strip()
    email = input("Email: ").strip()
    username = input("Username: ").strip().lower()
    password = input("Password (min 6 chars): ").strip()
    confirm = input("Confirm password: ").strip()

    if not name or not email or not username or len(password) < 6:
        print("Please fill all fields correctly.")
        return
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        print("Invalid email format.")
        return
    if password != confirm:
        print("Passwords do not match.")
        return
    if get_user(data, username):
        print("Username already exists.")
        return

    default_pin_hash = hash_value("1234")
    user = {
        "name": name,
        "email": email,
        "username": username,
        "passwordHash": hash_value(password),
        "cardStatus": "Not requested",
        "pinHash": default_pin_hash,
        "mobile": "",
        "city": "",
        "pincode": "",
        "locked": False
    }
    data["users"].append(user)
    data["current_user"] = username
    set_balance(data, username, 25000)
    save_data(data)
    print(f"\nAccount created successfully for {name}.\nDefault demo PIN: 1234")
    input("\nPress Enter to continue...")

def login_user(data):
    clear_screen()
    print_header("Login")
    username = input("Username: ").strip().lower()
    password = input("Password: ").strip()

    user = get_user(data, username)
    if not user or user["passwordHash"] != hash_value(password):
        print("Invalid username or password.")
        return
    data["current_user"] = username
    save_data(data)
    print(f"\nWelcome back, {user['name']}!")
    input("\nPress Enter to continue...")

def logout_user(data):
    data["current_user"] = None
    save_data(data)
    print("Logged out successfully.")
    input("\nPress Enter to continue...")

def dashboard(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header(f"Dashboard - {user['name']}")
    print(f"Username: {user['username']}")
    print(f"Balance: ₹{balance_for_user(data, user['username']):,.2f}")
    print(f"Card Status: {user['cardStatus']}")
    print(f"Account Status: {'Locked' if user['locked'] else 'Active'}")
    print(f"Mobile: {user['mobile'] if user['mobile'] else 'Not updated'}")
    print(f"Address: {user['city'] + ', ' + user['pincode'] if user['city'] or user['pincode'] else 'Not updated'}")
    print("\nQuick actions:")
    print("1. Security")
    print("2. ATM Card")
    print("3. Mobile Update")
    print("4. Address Update")
    print("5. Send Money")
    print("6. Statement")
    print("7. Change PIN")
    print("8. New Account")
    print("9. KYC")
    print("10. Notifications")
    print("11. AI Chatbot")
    print("12. Transactions")
    print("13. Loan EMI")
    print("14. Back")
    choice = input("Choose an option: ").strip()
    if choice == "1":
        security_controls(data)
    elif choice == "2":
        apply_card(data)
    elif choice == "3":
        update_mobile(data)
    elif choice == "4":
        update_address(data)
    elif choice == "5":
        send_money(data)
    elif choice == "6":
        view_statement(data)
    elif choice == "7":
        change_pin(data)
    elif choice == "8":
        open_account(data)
    elif choice == "9":
        kyc_submit(data)
    elif choice == "10":
        show_notifications(data)
    elif choice == "11":
        chatbot(data)
    elif choice == "12":
        show_transactions(data)
    elif choice == "13":
        loan_emi(data)
    elif choice == "14":
        return
    else:
        print("Invalid choice.")
        input("\nPress Enter to continue...")

def security_controls(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Account Security")
    print(f"Current status: {'Locked' if user['locked'] else 'Active'}")
    reason = input("Reason for lock/unlock (optional): ").strip()
    user["locked"] = not user["locked"]
    add_notification(data, user["username"], f"Account {'locked' if user['locked'] else 'unlocked'}" + (f" - {reason}" if reason else ""))
    save_data(data)
    print(f"\nAccount has been {'locked' if user['locked'] else 'unlocked'} successfully.")
    input("\nPress Enter to continue...")

def apply_card(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("ATM Card")
    card_type = input("Card type (Classic/Platinum): ").strip() or "Classic"
    user["cardStatus"] = f"{card_type} applied"
    add_notification(data, user["username"], f"{card_type} card application submitted.")
    save_data(data)
    print(f"\n{card_type} card request submitted successfully.")
    input("\nPress Enter to continue...")

def update_mobile(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Update Mobile Number")
    mobile = input("10-digit Indian mobile number: ").strip()
    if not re.fullmatch(r"[6-9]\d{9}", mobile):
        print("Invalid mobile number.")
        input("\nPress Enter to continue...")
        return
    user["mobile"] = mobile
    add_notification(data, user["username"], f"Mobile number updated to {mobile}.")
    save_data(data)
    print("Mobile number updated successfully.")
    input("\nPress Enter to continue...")

def update_address(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Update Address")
    city = input("City: ").strip()
    pincode = input("PIN code: ").strip()
    if not re.fullmatch(r"\d{6}", pincode):
        print("PIN code must be 6 digits.")
        input("\nPress Enter to continue...")
        return
    user["city"] = city
    user["pincode"] = pincode
    add_notification(data, user["username"], f"Address updated: {city}, {pincode}")
    save_data(data)
    print("Address updated successfully.")
    input("\nPress Enter to continue...")

def send_money(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    if user["locked"]:
        print("Your account is locked. Unlock it to transfer funds.")
        input("\nPress Enter to continue...")
        return

    clear_screen()
    print_header("Send Money")
    receiver = input("Receiver name: ").strip()
    upi = input("UPI ID: ").strip()
    amount = float(input("Amount (₹): ").strip())
    pin = input("Demo ATM PIN: ").strip()

    if amount <= 0:
        print("Amount must be greater than zero.")
        input("\nPress Enter to continue...")
        return

    if hash_value(pin) != user["pinHash"]:
        print("Incorrect PIN.")
        input("\nPress Enter to continue...")
        return

    current_balance = balance_for_user(data, user["username"])
    if amount > current_balance:
        print("Insufficient balance.")
        input("\nPress Enter to continue...")
        return

    new_balance = current_balance - amount
    set_balance(data, user["username"], new_balance)
    add_transaction(data, user["username"], f"Transfer to {receiver} ({upi})", amount, "Transfer")
    add_notification(data, user["username"], f"₹{amount:,.2f} sent to {receiver}.")
    save_data(data)
    print(f"\nTransfer successful. Remaining balance: ₹{new_balance:,.2f}")
    input("\nPress Enter to continue...")

def view_statement(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Statement")
    txs = get_bucket(data, "transactions", user["username"])
    if not txs:
        print("No transactions yet.")
    else:
        for idx, item in enumerate(txs[:10], start=1):
            print(f"{idx}. {item['date']} | {item['type']} | {item['description']} | {item['amount']}")
    print("\nOptions: [V] View more   [C] CSV export   [B] Back")
    choice = input("Choose: ").strip().lower()
    if choice == "c":
        csv_data = "date,type,description,amount\n"
        for item in txs:
            csv_data += f"{item['date']},{item['type']},{item['description']},{item['amount']}\n"
        with open("statement.csv", "w", encoding="utf-8") as f:
            f.write(csv_data)
        print("CSV exported to statement.csv")
    elif choice == "v":
        print("\nFull statement:")
        for item in txs:
            print(f"{item['date']} | {item['type']} | {item['description']} | {item['amount']}")
    input("\nPress Enter to continue...")

def change_pin(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Change ATM PIN")
    current = input("Current PIN: ").strip()
    new_pin = input("New 4-digit PIN: ").strip()
    confirm = input("Confirm new PIN: ").strip()

    if hash_value(current) != user["pinHash"]:
        print("Current PIN is incorrect.")
        input("\nPress Enter to continue...")
        return
    if not re.fullmatch(r"\d{4}", new_pin):
        print("PIN must be 4 digits.")
        input("\nPress Enter to continue...")
        return
    if new_pin != confirm:
        print("New PINs do not match.")
        input("\nPress Enter to continue...")
        return

    user["pinHash"] = hash_value(new_pin)
    save_data(data)
    print("PIN changed successfully.")
    input("\nPress Enter to continue...")

def open_account(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Open New Account")
    account_type = input("Account type (Savings/Current/Student): ").strip() or "Savings"
    reason = input("What will you use it for? ").strip()
    app_id = f"APP{int(datetime.now().timestamp())}"
    apps = data.get("applications", {}).get(user["username"], [])
    apps.insert(0, {
        "id": app_id,
        "type": account_type,
        "details": reason,
        "status": "Submitted",
        "created": now_iso()
    })
    data["applications"][user["username"]] = apps
    add_notification(data, user["username"], f"{account_type} account application {app_id} submitted.")
    save_data(data)
    print(f"\nApplication {app_id} submitted successfully.")
    input("\nPress Enter to continue...")

def kyc_submit(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Demo KYC")
    kyc_id = input("Enter fictional ID (demo only): ").strip()
    if not kyc_id:
        print("Please enter a valid fictional ID.")
        input("\nPress Enter to continue...")
        return
    data.setdefault("kyc", {})[user["username"]] = {"id": kyc_id, "status": "Verified"}
    save_data(data)
    print(f"KYC verified for demo ID: {kyc_id}")
    input("\nPress Enter to continue...")

def show_notifications(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Notifications")
    notes = get_bucket(data, "notifications", user["username"])
    if not notes:
        print("No notifications.")
    else:
        for note in notes:
            print(f"{note['date']} | {note['text']}")
    input("\nPress Enter to continue...")

def show_transactions(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Transactions")
    txs = get_bucket(data, "transactions", user["username"])
    if not txs:
        print("No transactions yet.")
    else:
        for item in txs:
            print(f"{item['date']} | {item['type']} | {item['description']} | {item['amount']}")
    input("\nPress Enter to continue...")

def chatbot(data):
    if not require_login(data):
        return
    clear_screen()
    print_header("AI Chatbot")
    print("Type 'exit' to quit.")
    while True:
        msg = input("You: ").strip().lower()
        if msg in ("exit", "quit"):
            break
        if "balance" in msg:
            bal = balance_for_user(data, current_user(data))
            print(f"Bot: Your demo balance is ₹{bal:,.2f}.")
        elif "transfer" in msg:
            print("Bot: You can send money from the dashboard > Send Money section.")
        elif "card" in msg:
            print("Bot: You can apply for a demo ATM card through the dashboard.")
        elif "pin" in msg:
            print("Bot: Your default demo PIN is 1234. You may change it anytime.")
        elif "loan" in msg:
            print("Bot: Use the Loan EMI Calculator on the dashboard to estimate monthly payments.")
        else:
            print("Bot: I can help with balance, transfers, cards, pin, and loan questions.")
    input("\nPress Enter to continue...")

def loan_emi(data):
    if not require_login(data):
        return
    clear_screen()
    print_header("Loan EMI Calculator")
    try:
        principal = float(input("Loan amount (₹): ").strip())
        annual_rate = float(input("Annual interest rate (%): ").strip())
        months = int(input("Tenure in months: ").strip())
        if principal <= 0 or months <= 0:
            print("Invalid values.")
            input("\nPress Enter to continue...")
            return
        rate_per_month = (annual_rate / 100) / 12
        if rate_per_month == 0:
            emi = principal / months
        else:
            emi = principal * rate_per_month * pow(1 + rate_per_month, months) / (pow(1 + rate_per_month, months) - 1)
        total = emi * months
        print(f"\nEMI: ₹{emi:,.2f}")
        print(f"Total payable: ₹{total:,.2f}")
        print(f"Total interest: ₹{total - principal:,.2f}")
    except ValueError:
        print("Invalid numeric input.")
    input("\nPress Enter to continue...")

def app_tracking(data):
    if not require_login(data):
        return
    user = get_user(data, current_user(data))
    clear_screen()
    print_header("Application Tracking")
    apps = data.get("applications", {}).get(user["username"], [])
    if not apps:
        print("No applications found.")
    else:
        for app in apps:
            created = app["created"]
            print(f"{app['id']} | {app['type']} | {app['status']} | {created}")
    input("\nPress Enter to continue...")

def main_menu():
    data = load_data()
    while True:
        clear_screen()
        print_header("SmartBank AI - Demo Banking")
        print("1. Register")
        print("2. Login")
        print("3. Dashboard")
        print("4. Logout")
        print("5. Exit")
        choice = input("Select an option: ").strip()

        if choice == "1":
            register_user(data)
        elif choice == "2":
            login_user(data)
        elif choice == "3":
            dashboard(data)
        elif choice == "4":
            logout_user(data)
        elif choice == "5":
            print("Goodbye!")
            break
        else:
            print("Invalid choice.")
            input("\nPress Enter to continue...")

if __name__ == "__main__":
    main_menu()
    