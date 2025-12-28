# EarthHero Local Setup

## 1. Clone the repository

```bash
cd C:/xampp/htdocs
git clone https://github.com/Siew-116/earth-hero 
```

## 2. Set up database
1. Open phpMyAdmin or your MySQL client.
2. Create a new database, e.g., earthhero.
3. Import the earthhero.sql file.

## 3. Configure environment variables
Create a .env file in the root folder
```env
# Mailtrap configuration
MAIL_HOST=your_mailtrap_host
MAIL_PORT=your_mailtrap_port
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_FROM=your_email@example.com
MAIL_FROM_NAME=EarthHero
```
Make sure .env is not committed to version control to keep credentials private.


## 4. Backend Configuration
Before running the project, make sure to configure your database credentials in `config.php`:
```php
// Database connection
$host =  // your host name, e.g., "localhost"
$user =  // your database username, e.g., "root"
$pass =  // your database password, e.g., ""
$db   =  // your database name, e.g., "earthhero"
```

## 5. Acess the application
1. Start Apache and MySQL from XAMPP.
2. Open your browser and go to:
http://localhost/earth-hero
3. You can now log in or create an account to test the application.