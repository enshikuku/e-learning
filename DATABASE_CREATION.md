# Database Creation

## E-LEARN Database

```sql
CREATE DATABASE e_learn_portal;
```

## e_admininfo Table

```sql
CREATE TABLE e_admininfo (
    a_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255),
    created_at TIMESTAMP,
    isactive VARCHAR(10)
);
```

## e_student Table

```sql
CREATE TABLE e_student (
    s_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255),
    name VARCHAR(255),
    password VARCHAR(255),
    learn INT,
    gender VARCHAR(255),
    profilePic VARCHAR(255),
    timestamp TIMESTAMP,
    isactive VARCHAR(10)
);
```

## learningresources Table

```sql
CREATE TABLE learningresources (
    lr_id INT PRIMARY KEY AUTO_INCREMENT,
    a_id INT,
    opened INT,
    totalremarks INT,
    rsctitle VARCHAR(255),
    learndefinition LONGTEXT,
    route VARCHAR(255),
    created_at TIMESTAMP,
    isactive VARCHAR(10),
    FOREIGN KEY (a_id) REFERENCES e_admininfo(a_id)
);
```

## remarks_table Table

```sql
CREATE TABLE remarks_table (
    r_id INT PRIMARY KEY AUTO_INCREMENT,
    lr_id INT,
    s_id INT,
    remark LONGTEXT,
    created_at TIMESTAMP,
    isactive VARCHAR(10),
    FOREIGN KEY (lr_id) REFERENCES learningresources(lr_id),
    FOREIGN KEY (s_id) REFERENCES e_student(s_id)
);
```

## chatroom Table

```sql
CREATE TABLE chatroom (
    c_id INT PRIMARY KEY AUTO_INCREMENT,
    s_id INT,
    a_id INT,
    tutor VARCHAR(255),
    chat LONGTEXT,
    created_at TIMESTAMP,
    isactive VARCHAR(10),
    FOREIGN KEY (s_id) REFERENCES e_student(s_id),
    FOREIGN KEY (a_id) REFERENCES e_admininfo(a_id)
);
```
## Generation of sample data for tables e_student and e_admininfo

Link to generate queries for data for e_student: [Random Student SQL Query](https://enshikuku.github.io/random_student_SQLquery/)

Link to generate queries for data for e_admininfo: [Random Admin SQL Query](https://enshikuku.github.io/random_student_SQLquery/admin.html)