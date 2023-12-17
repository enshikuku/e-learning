# E-LEARN Web Application

[E-LEARN GitHub Repository](https://github.com/enshikuku/e-learning)

E-LEARN is a comprehensive web application designed for educational institutions, providing seamless management of learning resources, student information, and administrative tasks.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Folder Structure](#folder-structure)
- [Key Dependencies](#key-dependencies)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Contributing](#contributing)

## Overview

E-LEARN simplifies the creation and management of learning resources, student profiles, and administrative tasks within educational institutions. This platform streamlines processes, fosters collaboration, and establishes a centralized hub for educators and administrators.

## Prerequisites

Ensure that Node.js and npm are installed on your machine before proceeding.

## Installation

Clone the repository and install the required dependencies.

```bash
git clone https://github.com/enshikuku/e-learning
cd e-learning
npm install
```

## Folder Structure

The project follows a well-defined folder structure:

```plaintext
- /public        # Static assets (stylesheets, images, etc.)
- /views         # View templates
```

## Key Dependencies

This project relies on essential dependencies, each serving a specific purpose. Install them using the following commands:

1. **Express:** A fast, unopinionated, minimalist web framework for Node.js.

    ```bash
    npm install express
    ```

2. **MySQL:** A popular relational database management system.

    ```bash
    npm install mysql
    ```

3. **Express Session:** A session middleware for Express to manage session data.

    ```bash
    npm install express-session
    ```

4. **Bcrypt:** A library for hashing and salting passwords.

    ```bash
    npm install bcrypt
    ```

5. **Multer:** Middleware for handling `multipart/form-data`, primarily used for file uploads.

    ```bash
    npm install multer
    ```

6. **File System (fs):** The Node.js built-in module for interacting with the file system.

7. **Dotenv:** A zero-dependency module that loads environment variables from a .env file into `process.env`.

    ```bash
    npm install dotenv
    ```

Ensure proper configuration by following the instructions provided in the [Configuration](#configuration) section.

## Configuration

Adjust application settings and environment variables as needed.

## Database Configuration

The following section outlines the database configuration for the E-LEARN Web Application. These SQL statements define the database structure, including tables and relationships.
Refer to the guide in the [Database Creation](DATABASE_CREATION.md) markdown for SQL queries and additional information.
## Running the Application

Launch the application locally by running:

```bash
npm start
```

Visit `http://localhost:3049` in your browser to access the application.

## Contributing

We welcome contributions to enhance and improve the project! To contribute, please follow these guidelines:

### Bug Reports and Feature Requests

If you encounter a bug or have a feature request, please open an issue on the [GitHub issue tracker](https://github.com/enshikuku/e-learning/issues). Before creating a new issue, check if a similar one already exists. When reporting a bug, provide a detailed description and steps to reproduce it.

### Pull Requests

We encourage you to submit pull requests for bug fixes, improvements, or new features. To do so:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Implement your changes and test thoroughly.
4. Commit your changes: `git commit -m "Description of changes"`.
5. Push your branch to your fork: `git push origin feature-name`.
6. Open a pull request on the [GitHub repository](https://github.com/enshikuku/e-learning/pulls) with a clear title and description of your changes.

### Coding Standards

Adhere to the coding standards used in the project, including indentation, formatting, and meaningful variable/function names.

Thank you for contributing!
