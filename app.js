import express from 'express'
import mysql from 'mysql'
import session from 'express-session'
import bcrypt from 'bcrypt'
import multer from 'multer'
import fs from 'fs'
import dotenv from 'dotenv'

const app = express()

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'e_learn_portal'
})

const storage1 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/imageuploads')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/pdfuploads')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.originalname)
    }
})

const upload1 = multer({ storage: storage1 })

const upload2 = multer({ storage: storage2 })

dotenv.config()

app.set('view engine', 'ejs')

app.use(express.static('public'))

app.use(express.urlencoded({extended: false}))

// prepare to use session
app.use(session({
    secret: 'e_learn_portal',
    saveUninitialized: false,
    resave: true
}))

// continue to check if user is loged in
app.use((req, res, next) => {
    if (req.session.userID === undefined) {
        res.locals.isLogedIn = false
        res.locals.username = 'Guest'
    } else {
        res.locals.username = req.session.username
        res.locals.tutor = req.session.usernamefull
        res.locals.isLogedIn = true

    }
    next()
})

// check if user is admin
app.use((req, res, next) => {
    if (req.session.adminPin === undefined) {
        res.locals.sessionpin = false
    } else {
        res.locals.sessionpin = true
    }
    next()
})

// check if user is superadmin
app.use((req, res, next) => {
    if (req.session.superadminPin === undefined) {
        res.locals.superadminsession = false
    } else {
        res.locals.superadminsession = true
    }
    next()
})

let adminAuthenticationPin = process.env.ADMIN_AUTH_PIN
let superAdminAuthPin = process.env.SUPER_ADMIN_AUTH_PIN

// Landing page
app.get('/', (req, res) => {
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        console.log('User is logged in with admin privileges. Redirecting to adminhome.')
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        console.log('User is logged in. Redirecting to home.')
        res.redirect('home')
    } else {
        console.log('Rendering landing page successfully.')
        res.render('index')
    }
})

// Display Signup Page
app.get('/signup', (req, res) => {
    const user = {
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    }

    if (res.locals.isLogedIn && res.locals.sessionpin) {
        console.log('User is logged in with admin privileges. Redirecting to adminhome.')
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        console.log('User is logged in. Redirecting to home.')
        res.redirect('home')
    } else {
        console.log('Rendering signup page successfully.')
        res.render('signup', { error: false, user: user })
    }
})

// Process signup form
app.post('/signup', (req, res) => {
    const user = {
        name: req.body.fullname,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    }

    if (user.password === user.confirmPassword) {
        // Check if user exists
        let sql = 'SELECT * FROM e_student WHERE email = ?'
        connection.query(sql, [user.email], (error, results) => {
            if (error) {
                console.error('Error checking if user exists:', error)
                res.status(500).render('error', { error: 'Error checking if user exists' })
            } else {
                if (results.length > 0) {
                    console.log('Account already exists with the email provided. Rendering signup page with error message.')
                    let message = 'Account already exists with the email provided!'
                    res.render('signup', { error: true, message: message, user: user })
                } else {
                    // Create account
                    bcrypt.hash(user.password, 10, (error, hash) => {
                        let sql = 'INSERT INTO e_student (email, name, password, learn, profilePic, isactive) VALUES (?,?,?,?,?,?)'
                        connection.query(
                            sql,
                            [user.email, user.name, hash, 0, 'user.png', 'active'],
                            (error, results) => {
                                if (error) {
                                    console.error('Error creating account:', error)
                                    res.status(500).render('error', { error: 'Error creating account' })
                                } else {
                                    console.log('Account created successfully. Redirecting to login page.')
                                    res.redirect('/login')
                                }
                            }
                        )
                    })
                }
            }
        })
    } else {
        console.log('Passwords don\'t match. Rendering signup page with error message.')
        let message = 'Passwords don\'t match!'
        res.render('signup', { error: true, message: message, user: user })
    }
})

// Display Login Page
app.get('/login', (req, res) => {
    const user = {
        email: '',
        password: ''
    }

    if (res.locals.isLogedIn && res.locals.sessionpin) {
        console.log('User is logged in with admin privileges. Redirecting to adminhome.')
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        console.log('User is logged in. Redirecting to home.')
        res.redirect('home')
    } else {
        console.log('Rendering login page successfully.')
        res.render('login', { error: false, user: user })
    }
})

// Process login page
app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    let sql = 'SELECT * FROM e_student WHERE email = ?'
    connection.query(sql, [user.email], (error, results) => {
        if (error) {
            console.error('Error fetching user for login:', error)
            res.status(500).render('error', { error: 'Error fetching user for login' })
        } else {
            if (results.length > 0) {
                if (results[0].isactive === 'active') {
                    bcrypt.compare(user.password, results[0].password, (error, passwordMatches) => {
                        if (error) {
                            console.error('Error comparing passwords:', error)
                            res.status(500).render('error', { error: 'Error comparing passwords' })
                        } else {
                            if (passwordMatches) {
                                console.log('Login successful. Redirecting to home.')
                                req.session.userID = results[0].s_id
                                req.session.username = results[0].name.split(' ')[0]
                                res.redirect('/home')
                            } else {
                                console.log('Incorrect password. Rendering login page with error message.')
                                let message = 'Incorrect password!'
                                res.render('login', { error: true, message: message, user: user })
                            }
                        }
                    })
                } else {
                    console.log('User account is inactive. Rendering login page with error message.')
                    let message = 'Your account is inactive. Call Manager to activate'
                    res.render('login', { error: true, message: message, user: user })
                }
            } else {
                console.log('Account does not exist. Rendering login page with error message.')
                let message = 'Account does not exist. Please create one'
                res.render('login', { error: true, message: message, user: user })
            }
        }
    })
})

// Home
app.get('/home', (req, res) => {
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        console.log('Redirecting to adminhome')
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        console.log('Rendering home page successfully')
        res.render('home')
    } else {
        console.error('Unauthorized access to home page. Redirecting to /')
        res.redirect('/')
    }
})

// Learn page
app.get('/learn', (req, res) => {
    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT * FROM learningresources',
            [],
            (error, results) => {
                if (error) {
                    console.error('Error fetching learning resources:', error)
                    res.status(500).render('error', { error: 'Error fetching learning resources' })
                } else {
                    console.log('Rendering learn page successfully')
                    res.render('learn', { results: results })
                }
            }
        )
    } else {
        console.error('Unauthorized access to learn page. Redirecting to login')
        res.redirect('/login')
    }
})

// PDF view
app.get('/viewpdf/:lr_id', (req, res) => {
    const lr_id = req.params.lr_id

    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT learn FROM e_student WHERE s_id = ?',
            [req.session.userID],
            (error, results) => {
                if (error) {
                    console.error('Error updating learn count for student:', error)
                    res.status(500).render('error', { error: 'Error updating learn count for student' })
                } else {
                    const newResult = results[0].learn + 1
                    connection.query(
                        'UPDATE e_student SET learn = ? WHERE s_id = ?',
                        [newResult, req.session.userID],
                        (error, results) => {
                            if (error) {
                                console.error('Error updating opened count for learning resource:', error)
                                res.status(500).render('error', { error: 'Error updating opened count for learning resource' })
                            } else {
                                connection.query(
                                    'SELECT * FROM learningresources WHERE lr_id = ?',
                                    [lr_id],
                                    (error, results) => {
                                        if (error) {
                                            console.error('Error fetching learning resource for PDF view:', error)
                                            res.status(500).render('error', { error: 'Error fetching learning resource for PDF view' })
                                        } else {
                                            const newOpened = results[0].opened + 1
                                            connection.query(
                                                'UPDATE learningresources SET opened = ? WHERE lr_id = ?',
                                                [newOpened, lr_id],
                                                (error, results) => {
                                                    if (error) {
                                                        console.error('Error updating opened count for learning resource:', error)
                                                        res.status(500).render('error', { error: 'Error updating opened count for learning resource' })
                                                    } else {
                                                        console.log('Rendering PDF page successfully')
                                                        res.render('pdf', { routes: results[0] })
                                                    }
                                                }
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    )
                }
            }
        )
    } else {
        console.error('Unauthorized access to PDF view. Redirecting to login')
        res.redirect('/login')
    }
})

// Remark view
app.get('/remark/:lr_id', (req, res) => {
    const lr_id = req.params.lr_id
    const studentID = req.session.userID

    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT rsctitle FROM learningresources WHERE lr_id = ?',
            [lr_id],
            (error, results) => {
                if (error) {
                    console.error('Error fetching learning resource for remark:', error)
                    res.status(500).render('error', { error: 'Error fetching learning resource for remark' })
                } else {
                    console.log('Rendering remark page successfully')
                    res.render('remark', { lr_id: lr_id, studentID: studentID, results: results[0] })
                }
            }
        )
    } else {
        console.error('Unauthorized access to remark page. Redirecting to login')
        res.redirect('/login')
    }
})

// Process Remark form
app.post('/remark/:lr_id/:studentID', (req, res) => {
    const lr_id = req.params.lr_id
    const studentID = req.params.studentID
    const userRemarks = {
        remark: req.body.remark,
    }

    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT totalremarks FROM learningresources WHERE lr_id = ?',
            [lr_id],
            (error, results) => {
                if (error) {
                    console.error('Error fetching totalremarks for learning resource:', error)
                    res.status(500).render('error', { error: 'Error fetching totalremarks for learning resource' })
                } else {
                    const newTotalRemarks = results[0].totalremarks + 1

                    connection.query(
                        'UPDATE learningresources SET totalremarks = ? WHERE lr_id = ?',
                        [newTotalRemarks, lr_id],
                        (error, results) => {
                            if (error) {
                                console.error('Error updating totalremarks for learning resource:', error)
                                res.status(500).render('error', { error: 'Error updating totalremarks for learning resource' })
                            } else {
                                connection.query(
                                    'INSERT INTO remarks_table (lr_id, s_id, remark, isactive) VALUES (?, ?, ?, ?)',
                                    [lr_id, studentID, userRemarks.remark, 'active'],
                                    (error, results) => {
                                        if (error) {
                                            console.error('Error inserting remark:', error)
                                            res.status(500).render('error', { error: 'Error inserting remark' })
                                        } else {
                                            console.log('Remark submitted successfully. Redirecting to learn')
                                            res.redirect('/learn')
                                        }
                                    }
                                )
                            }
                        }
                    )
                }
            }
        )
    } else {
        console.error('Unauthorized access to remark form submission. Redirecting to login')
        res.redirect('/login')
    }
})

// Progress view
app.get('/progress', (req, res) => {
    if (res.locals.isLogedIn) {
        let sql = 'SELECT * FROM e_student WHERE s_id = ?'
        connection.query(
            sql, [req.session.userID], (error, results) => {
                if (error) {
                    console.error('Error fetching progress data:', error)
                    res.status(500).render('error', { error: 'Error fetching progress data' })
                } else {
                    console.log('Rendering progress page successfully')
                    res.render('progress', { profile: results[0] })
                }
            }
        )
    } else {
        console.error('Unauthorized access to progress page. Redirecting to login')
        res.redirect('/login')
    }
})

// Edit Profile view
app.get('/editMyProfile', (req, res) => {
    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT * FROM e_student WHERE s_id = ?',
            [req.session.userID],
            (error, results) => {
                if (error) {
                    console.error('Error fetching profile data for editing:', error)
                    res.status(500).render('error', { error: 'Error fetching profile data for editing' })
                } else {
                    console.log('Rendering editProfile page successfully')
                    res.render('editProfile', { profile: results[0] })
                }
            }
        )
    } else {
        console.error('Unauthorized access to editMyProfile page. Redirecting to login')
        res.redirect('/login')
    }
})

// Process Edit Profile form
app.post('/editProfile/:s_id', upload1.single('profilePic'), (req, res) => {
    if (res.locals.isLogedIn) {
        const s_id = parseInt(req.params.s_id)
        const { email, name, gender } = req.body

        if (req.file) {
            connection.query(
                'UPDATE e_student SET email = ?, name = ?, gender = ?, profilePic = ? WHERE s_id = ?',
                [email, name, gender, req.file.filename, s_id],
                (error, results) => {
                    if (error) {
                        console.error('Error updating profile with picture:', error)
                        res.status(500).render('error', { error: 'Error updating profile with picture' })
                    } else {
                        console.log('Profile updated successfully with picture. Redirecting to progress')
                        res.redirect('/progress')
                    }
                }
            )
        } else {
            connection.query(
                'UPDATE e_student SET email = ?, name = ?, gender = ?  WHERE s_id = ?',
                [email, name, gender, s_id],
                (error, results) => {
                    if (error) {
                        console.error('Error updating profile without picture:', error)
                        res.status(500).render('error', { error: 'Error updating profile without picture' })
                    } else {
                        console.log('Profile updated successfully without picture. Redirecting to progress')
                        res.redirect('/progress')
                    }
                }
            )
        }
    } else {
        console.error('Unauthorized access to editProfile form submission. Redirecting to login')
        res.redirect('/login')
    }
})

// Render chatroom
app.get('/chatroom', (req, res) => {
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT chatroom.*, e_student.name AS student_name, e_admininfo.name AS admin_name FROM chatroom LEFT JOIN e_student ON chatroom.s_id = e_student.s_id LEFT JOIN e_admininfo ON chatroom.a_id = e_admininfo.a_id',
            [],
            (error, results) => {
                if (error) {
                    console.error('Error fetching chatroom data:', error)
                    res.status(500).render('error', { error: 'Error fetching chatroom data' })
                } else {
                    let senderID = req.session.userID
                    console.log('Rendering chatroom page successfully')
                    res.render('chatroom', { results: results, admin: true, senderID: senderID })
                }
            }
        )
    } else if (res.locals.isLogedIn) {
        connection.query(
            'SELECT chatroom.*, e_student.name AS student_name, e_admininfo.name AS admin_name FROM chatroom LEFT JOIN e_student ON chatroom.s_id = e_student.s_id LEFT JOIN e_admininfo ON chatroom.a_id = e_admininfo.a_id',
            [],
            (error, results) => {
                if (error) {
                    console.error('Error fetching chatroom data:', error)
                    res.status(500).render('error', { error: 'Error fetching chatroom data' })
                } else {
                    let senderID = req.session.userID
                    console.log('Rendering chatroom page successfully')
                    res.render('chatroom', { results: results, admin: false, senderID: senderID })
                }
            }
        )
    } else {
        console.error('Unauthorized access to chatroom page. Redirecting to login')
        res.redirect('/login')
    }
})

// Send message in chatroom
app.post('/sendmessage', (req, res) => {
    const chatInfo = {
        id: req.body.id,
        message: req.body.message,
    }

    if (res.locals.sessionpin) {
        connection.query(
            'INSERT INTO chatroom (a_id, tutor, chat, isactive) VALUES (?, ?, ?, ?)',
            [
                chatInfo.id,
                'true',
                chatInfo.message,
                'active',
            ],
            (error, results) => {
                if (error) {
                    console.error('Error sending message:', error)
                    res.status(500).send('Error sending message')
                } else {
                    console.log('Message sent successfully. Redirecting to chatroom')
                    res.redirect('/chatroom')
                }
            }
        )
    } else if (res.locals.isLogedIn) {
        connection.query(
            'INSERT INTO chatroom (s_id, tutor, chat, isactive) VALUES (?, ?, ?, ?)',
            [
                chatInfo.id,
                'false',
                chatInfo.message,
                'active',
            ],
            (error, results) => {
                if (error) {
                    console.error('Error sending message:', error)
                    res.status(500).send('Error sending message')
                } else {
                    console.log('Message sent successfully. Redirecting to chatroom')
                    res.redirect('/chatroom')
                }
            }
        )
    } else {
        console.error('Unauthorized access to sendmessage page. Redirecting to login')
        res.redirect('/login')
    }
})

// Clear Messages
app.post('/clearchats', (req, res) => {
    connection.query(
        'DELETE FROM chatroom WHERE c_id > ?',
        [0],
        (error, results) => {
            if (error) {
                console.error('Error clearing chatroom messages:', error)
                res.status(500).send('Error clearing chatroom messages')
            } else {
                console.log('Chatroom messages cleared successfully. Redirecting to chatroom')
                res.redirect('/chatroom')
            }
        }
    )
})

// Delete Specific Chat
app.post('/deletemessage/:c_id', (req, res) => {
    connection.query(
        'DELETE FROM chatroom WHERE c_id = ?',
        [req.params.c_id],
        (error, results) => {
            if (error) {
                console.error('Error deleting chatroom message:', error)
                res.status(500).send('Error deleting chatroom message')
            } else {
                console.log('Chatroom message deleted successfully. Redirecting to chatroom')
                res.redirect('/chatroom')
            }
        }
    )
})

// Admin signup
app.get('/adminsignup', (req, res) => {
    const admin = {
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        pin: '',
    }
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        console.log('User is already logged in. Redirecting to adminhome')
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        console.error('Unauthorized access to adminsignup page. Redirecting to home')
        res.redirect('home')
    } else {
        console.log('Rendering adminsignup page successfully')
        res.render('adminsignup', { error: false, admin: admin })
    }
})

// Process admin signup form
app.post('/adminsignup', (req, res) => {
    const admin = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        pin: req.body.adminPin,
    }
    if (admin.pin === adminAuthenticationPin) {
        if (admin.password === admin.confirmPassword) {
            connection.query(
                'SELECT * FROM e_adminInfo WHERE email = ?',
                [admin.email],
                (error, results) => {
                    if (error) {
                        console.error('Error checking existing admin account:', error)
                        res.status(500).send('Error checking existing admin account')
                    } else if (results.length > 0) {
                        let message = 'Sorry! You already have an account with that Email'
                        admin.email = ''
                        console.error('Duplicate admin account. Rendering adminsignup page with error message')
                        res.render('adminsignup', { error: true, message: message, admin: admin })
                    } else {
                        // Create account
                        bcrypt.hash(admin.password, 10, (hashError, hash) => {
                            if (hashError) {
                                console.error('Error hashing password:', hashError)
                                res.status(500).send('Error hashing password')
                            } else {
                                connection.query(
                                    'INSERT INTO e_adminInfo (name, email, password, isactive) VALUES (?,?,?,?)',
                                    [
                                        admin.name,
                                        admin.email,
                                        hash,
                                        'active',
                                    ],
                                    (insertError, insertResults) => {
                                        if (insertError) {
                                            console.error('Error creating admin account:', insertError)
                                            res.status(500).send('Error creating admin account')
                                        } else {
                                            console.log('Admin account created successfully. Redirecting to adminlogin')
                                            res.redirect('/adminlogin')
                                        }
                                    }
                                )
                            }
                        })
                    }
                }
            )
        } else {
            let message = 'Passwords do not match!'
            admin.password = ''
            admin.confirmPassword = ''
            console.error('Password mismatch. Rendering adminsignup page with error message')
            res.render('adminsignup', { error: true, message: message, admin: admin })
        }
    } else {
        let message = 'Incorrect Admin pin'
        admin.pin = ''
        console.error('Incorrect Admin pin. Rendering adminsignup page with error message')
        res.render('adminsignup', { error: true, message: message, admin: admin })
    }
})


// Admin login
app.get('/adminlogin', (req, res) => {
    const admin = {
        email: '',
        password: '',
        pin: ''
    }
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        console.log('User is already logged in. Redirecting to adminhome')
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        console.error('Unauthorized access to adminlogin page. Redirecting to home')
        res.redirect('home')
    } else {
        console.log('Rendering adminlogin page successfully')
        res.render('adminlogin', { error: false, admin: admin })
    }
})

// Process admin login form
app.post('/adminlogin', (req, res) => {
    const admin = {
        email: req.body.email,
        password: req.body.password,
        pin: req.body.pin
    }

    if (admin.pin === adminAuthenticationPin) {
        // Check if user exists
        connection.query(
            'SELECT * FROM e_admininfo WHERE email = ?',
            [admin.email],
            (error, results) => {
                if (error) {
                    console.error('Error checking admin account:', error)
                    res.status(500).send('Error checking admin account')
                } else if (results.length > 0) {
                    if (results[0].isactive === 'active') {
                        bcrypt.compare(admin.password, results[0].password, (error, passwordMatches) => {
                            if (error) {
                                console.error('Error comparing passwords:', error)
                                res.status(500).send('Error comparing passwords')
                            } else if (passwordMatches) {
                                console.log('Admin logged in successfully. Redirecting to adminhome')
                                req.session.userID = results[0].a_id
                                req.session.username = results[0].name.split(' ')[0]
                                req.session.usernamefull = results[0].name
                                req.session.adminPin = adminAuthenticationPin
                                res.redirect('/adminhome')
                            } else {
                                let message = 'Incorrect password!'
                                admin.password = ''
                                console.error('Incorrect password. Rendering adminlogin page with error message')
                                res.render('adminlogin', { error: true, message: message, admin: admin })
                            }
                        })
                    } else {
                        let message = 'Your Account is inactive. Call manager to continue'
                        console.error('Inactive admin account. Rendering adminlogin page with error message')
                        res.render('adminlogin', { error: true, message: message, admin: admin })
                    }
                } else {
                    let message = 'You do not have an account with that email! Please create one'
                    console.error('Admin account not found. Rendering adminlogin page with error message')
                    res.render('adminlogin', { error: true, message: message, admin: admin })
                }
            }
        )
    } else {
        let message = 'Incorrect Admin pin'
        console.error('Incorrect Admin pin. Rendering adminlogin page with error message')
        res.render('adminlogin', { error: true, message: message, admin: admin })
    }
})

// Render admin home page
app.get('/adminhome', (req, res) => {
    if (res.locals.sessionpin) {
        console.log('Rendering adminhome page successfully')
        res.render('adminhome')
    } else {
        console.error('Unauthorized access to adminhome page. Redirecting to adminlogin')
        res.redirect('/adminlogin')
    }
})

// Render viewStudent
app.get('/viewstudent', (req, res) => {
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT * FROM e_student',
            [],
            (error, results) => {
                if (error) {
                    console.error('Error fetching student data:', error)
                    res.status(500).render('error', { error: 'Error fetching student data' })
                } else {
                    console.log('Rendering viewstudent page successfully')
                    res.render('viewstudent', { results: results })
                }
            }
        )
    } else {
        console.error('Unauthorized access to viewstudent page. Redirecting to adminlogin')
        res.redirect('/adminlogin')
    }
})

// Render viewresource
app.get('/viewresource', (req, res) => {
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT learningresources.*, e_admininfo.name FROM learningresources LEFT JOIN e_admininfo ON learningresources.a_id = e_admininfo.a_id',
            [],
            (error, results) => {
                if (error) {
                    console.error('Error fetching resource data:', error)
                    res.status(500).render('error', { error: 'Error fetching resource data' })
                } else {
                    console.log('Rendering viewresource page successfully')
                    res.render('viewresource', { results: results })
                }
            }
        )
    } else {
        console.error('Unauthorized access to viewresource page. Redirecting to adminlogin')
        res.redirect('/adminlogin')
    }
})

// Render addresource
app.get('/addresource', (req, res) => {
    const resourceInfo = {
        title: req.body.rsctitle,
        definition: req.body.learndefinition,
        resource: req.body.resource
    }
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT * FROM learningresources',
            [],
            (error, results) => {
                if (error) {
                    console.error('Error fetching resource data:', error)
                    res.status(500).render('error', { error: 'Error fetching resource data' })
                } else {
                    console.log('Rendering addresource page successfully')
                    res.render('addresource', { error: false, results: results, resourceInfo: resourceInfo })
                }
            }
        )
    } else {
        console.error('Unauthorized access to addresource page. Redirecting to adminlogin')
        res.redirect('/adminlogin')
    }
})

// Adding resource
app.post('/addresource', upload2.single('route'), (req, res) => {
    const resourceInfo = {
        title: req.body.rsctitle,
        definition: req.body.learndefinition,
        resource: req.body.resource,
        filename: req.file.originalname,
    }

    connection.query(
        'SELECT rsctitle FROM learningresources WHERE rsctitle = ?',
        [resourceInfo.title],
        (error, titleResults) => {
            if (error) {
                console.error('Error checking existing resource titles:', error)
                res.status(500).send('Error checking existing resource titles')
            } else if (titleResults.length > 0) {
                let message = 'There is already a resource with the title! Please rename!'
                resourceInfo.title = ''
                console.error('Duplicate resource title. Rendering addresource page with error message')
                res.render('addresource', { error: true, message: message, resourceInfo: resourceInfo })
            } else {
                connection.query(
                    'SELECT route FROM learningresources WHERE route = ?',
                    [resourceInfo.filename],
                    (error, routeResults) => {
                        if (error) {
                            console.error('Error checking existing file names:', error)
                            res.status(500).send('Error checking existing file names')
                        } else if (routeResults.length > 0) {
                            let message = 'File name already exists! Please rename the file before uploading.'
                            resourceInfo.filename = ''
                            console.error('Duplicate file name. Rendering addresource page with error message')
                            res.render('addresource', { error: true, message: message, resourceInfo: resourceInfo })
                        } else {
                            connection.query(
                                'INSERT INTO learningresources (rsctitle, learndefinition, route, a_id, isactive) VALUES (?, ?, ?, ?, ?)',
                                [
                                    resourceInfo.title,
                                    resourceInfo.definition,
                                    resourceInfo.filename,
                                    req.session.userID,
                                    'active'
                                ],
                                (error, insertResults) => {
                                    if (error) {
                                        console.error('Error inserting resource:', error)
                                        res.status(500).send('Error inserting resource')
                                    } else {
                                        console.log('Resource added successfully. Redirecting to viewresource')
                                        res.redirect('/viewresource')
                                    }
                                }
                            )
                        }
                    }
                )
            }
        }
    )
})

// Edit resource
app.get('/editresource/:lr_id', (req, res) => {
    let lr_id = req.params.lr_id
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT * FROM learningresources WHERE lr_id = ?',
            [lr_id],
            (error, results) => {
                if (error) {
                    console.error('Error fetching resource data for editing:', error)
                    res.status(500).send('Error fetching resource data for editing')
                } else {
                    console.log('Rendering editresource page successfully')
                    res.render('editresource', { results: results[0], error: false })
                }
            }
        )
    } else {
        console.error('Unauthorized access to editresource page. Redirecting to adminlogin')
        res.redirect('/adminlogin')
    }
})

// Editing the resource
app.post('/editresource/:lr_id', upload2.single('route'), (req, res) => {
    let lr_id = req.params.lr_id
    const resourceInfo = {
        title: req.body.rsctitle,
        definition: req.body.learndefinition
    }
    if (req.file) {
        connection.query(
            'UPDATE learningresources SET rsctitle = ?, learndefinition = ?, route = ? WHERE lr_id = ? ',
            [
                resourceInfo.title,
                resourceInfo.definition,
                req.file.originalname,
                lr_id
            ],
            (error, results) => {
                if (error) {
                    console.error('Error updating resource:', error)
                    res.status(500).send('Error updating resource')
                } else {
                    console.log('Resource updated successfully. Redirecting to viewresource')
                    res.redirect('/viewresource')
                }
            }
        )
    } else {
        connection.query(
            'UPDATE learningresources SET rsctitle = ?, learndefinition = ? WHERE lr_id = ? ',
            [
                resourceInfo.title,
                resourceInfo.definition,
                lr_id
            ],
            (error, results) => {
                if (error) {
                    console.error('Error updating resource:', error)
                    res.status(500).send('Error updating resource')
                } else {
                    console.log('Resource updated successfully. Redirecting to viewresource')
                    res.redirect('/viewresource')
                }
            }
        )
    }
})

// Delete resource
app.post('/delete/:lr_id', (req, res) => {
    connection.query(
        'SELECT * FROM learningresources WHERE lr_id = ?',
        [req.params.lr_id],
        (error, results) => {
            if (error) {
                console.error('Error fetching resource data:', error)
                res.status(500).send('Error fetching resource data')
            } else {
                const filePath = `./public/pdfuploads/${results[0].route}`
                
                // Check if the file exists before attempting to delete
                fs.access(filePath, fs.constants.F_OK, (accessError) => {
                    if (accessError) {
                        console.error('File does not exist. Redirecting to viewresource')
                        res.redirect('/viewresource')
                    } else {
                        // File exists, proceed with deletion
                        fs.unlink(filePath, (unlinkError) => {
                            if (unlinkError) {
                                console.error('Error deleting resource file:', unlinkError)
                                res.status(500).send('Error deleting resource file')
                            } else {
                                connection.query(
                                    'DELETE FROM learningresources WHERE lr_id = ?',
                                    [req.params.lr_id],
                                    (deleteError, deleteResults) => {
                                        if (deleteError) {
                                            console.error('Error deleting resource:', deleteError)
                                            res.status(500).send('Error deleting resource')
                                        } else {
                                            console.log('Resource deleted successfully. Redirecting to viewresource')
                                            res.redirect('/viewresource')
                                        }
                                    }
                                )
                            }
                        })
                    }
                })
            }
        }
    )
})

// Render viewremarks
app.get('/viewremark', (req, res) => {
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT rt.*, e.name, lr.rsctitle FROM remarks_table AS rt JOIN e_student AS e ON rt.s_id = e.s_id JOIN learningresources AS lr ON rt.lr_id = lr.lr_id',
            [],
            (error, results) => {
                if (error) {
                    console.error('Error fetching remarks data:', error)
                    res.status(500).render('error', { error: 'Error fetching remarks data' })
                } else {
                    console.log('Rendering viewremark page successfully')
                    res.render('viewremark', { results: results })
                }
            }
        )
    } else {
        console.error('Unauthorized access to viewremark page. Redirecting to adminlogin')
        res.redirect('/adminlogin')
    }
})

// Handle remark
app.post('/handle/:r_id', (req, res) => {
    connection.query(
        'DELETE FROM remarks_table WHERE r_id = ?',
        [req.params.r_id],
        (error, results) => {
            if (error) {
                console.error('Error handling remark:', error)
                res.status(500).send('Error handling remark')
            } else {
                console.log('Remark handled successfully. Redirecting to viewremark')
                res.redirect('/viewremark')
            }
        }
    )
})

// render superadmin
app.get('/superadminlogin', (req, res) => {
    const superadmin = {
        pin: ''
    }
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        console.log('Rendering superadminlogin page successfully')
        res.render('superadminlogin', { error: false, superadmin: superadmin })
    } else if (res.locals.isLogedIn) {
        console.error('Unauthorized access to superadminlogin page. Redirecting to home')
        res.redirect('home')
    } else {
        console.error('Unauthorized access to superadminlogin page. Redirecting to adminlogin')
        res.redirect('/adminlogin')
    }
})

app.post('/superadminlogin', (req, res) => {
    const superadmin = {
        superadminpin: req.body.superadminpin
    }
    if (superadmin.superadminpin === superAdminAuthPin) {
        req.session.superadminPin = adminAuthenticationPin
        console.log('Superadmin logged in successfully. Redirecting to manager')
        res.redirect('/manager')
    } else {
        let message = 'Wrong Superadmin Pin'
        console.error('Incorrect Superadmin Pin entered. Rendering superadminlogin page with error message')
        res.render('superadminlogin', { error: true, message: message, superadmin: superadmin })
    }
})


app.get('/manager', (req, res) => {
    if (res.locals.isLogedIn && res.locals.sessionpin && res.locals.superadminsession) {
        console.log('Rendering manager page successfully')
        res.render('manager')
    } else {
        console.error('Unauthorized access to manager page. Redirecting to superadminlogin')
        res.redirect('/superadminlogin')
    }
})

app.get('/studentmanager', (req, res) => {
    if (res.locals.isLogedIn && res.locals.sessionpin && res.locals.superadminsession) {
        connection.query(
            'SELECT * FROM e_student',
            [],
            (error, results) => {
                if (error) {
                    console.error('Error fetching student data:', error)
                    res.status(500).render('error', { error: 'Error fetching student data' })
                } else {
                    console.log('Rendering studentmanager page successfully')
                    res.render('studentmanager', { results: results })
                }
            }
        )
    } else if (res.locals.isLogedIn) {
        console.error('Unauthorized access to studentmanager page. Redirecting to home')
        res.redirect('/home')
    } else {
        console.error('Unauthorized access to studentmanager page. Redirecting to adminlogin')
        res.redirect('/adminlogin')
    }
})

// activate student
app.post('/activatestudent/:s_id', (req, res) => {
    connection.query(
        "UPDATE e_student SET isactive = 'active' WHERE s_id = ?",
        [req.params.s_id],
        (error, results) => {
            if (error) {
                console.error('Error activating student:', error)
                res.status(500).send('Error activating student')
            } else {
                console.log('Student activated successfully')
                res.redirect('/studentmanager')
            }
        }
    )
})

// deactivate student
app.post('/deactivatestudent/:s_id', (req, res) => {
    connection.query(
        "UPDATE e_student SET isactive = 'inactive' WHERE s_id = ?",
        [req.params.s_id],
        (error, results) => {
            if (error) {
                console.error('Error deactivating student:', error)
                res.status(500).send('Error deactivating student')
            } else {
                console.log('Student deactivated successfully')
                res.redirect('/studentmanager')
            }
        }
    )
})

app.get('/adminmanager', (req, res) => {
    if (res.locals.isLogedIn && res.locals.sessionpin && res.locals.superadminsession) {
        connection.query(
            'SELECT * FROM e_admininfo',
            [],
            (error, results) => {
                res.render('adminmanager', {results: results})
            }
        )
    } else if (res.locals.isLogedIn) {
        res.redirect('/home')
    } else {
        res.redirect('/adminlogin')
    }
})

// activate admin
app.post('/activateadmin/:a_id', (req, res) => {
    connection.query (
        "UPDATE e_admininfo SET isactive = 'active' WHERE a_id = ?",
        [req.params.a_id],
        (error, results) => {
            if (error) {
                console.error("Error activating admin:", error)
                res.status(500).send("Error activating admin")
            } else {
                console.log("Admin activated successfully")
                res.redirect('/adminmanager')
            }
        }
    )
})

// deactivate admin
app.post('/deactivateadmin/:a_id', (req, res) => {
    connection.query (
        "UPDATE e_admininfo SET isactive = 'inactive' WHERE a_id = ?",
        [req.params.a_id],
        (error, results) => {
            if (error) {
                console.error("Error deactivating admin:", error)
                res.status(500).send("Error deactivating admin")
            } else {
                console.log("Admin deactivated successfully")
                res.redirect('/adminmanager')
            }
        }
    )
})

app.get('/terms', (req, res) => {
    console.log('Rendering terms page')
    res.render('terms')
})

app.get('/privacy', (req, res) => {
    console.log('Rendering privacy page')
    res.render('privacy')
})

app.get('/codeofconduct', (req, res) => {
    console.log('Rendering codeofconduct page')
    res.render('codeofconduct')
})

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        console.log('Logging out and redirecting to /')
        res.redirect('/')
    })
})

app.get('*', (req, res) => {
    console.log('Rendering pagenotfound page')
    res.render('pagenotfound')
})

const PORT = process.env.PORT || 3049
app.listen(PORT, () => {
    console.log(`Server is now live at port ${PORT}`)
})
