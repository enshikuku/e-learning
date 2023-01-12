import express from 'express'
import mysql from 'mysql'
import session from 'express-session'
import bcrypt from 'bcrypt'
import multer from 'multer'

const app = express()

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'e_learning_portal'
})

const uploads = multer({dest: 'public/images/profileUploads' })

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: false}))

// prepare to use session
app.use(session({
    secret: 'e_learning_portal',
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
        res.locals.isLogedIn = true

    }
    next()
} )
// Landing page
app.get('/', (req, res) => {
    if (res.locals.isLogedIn && req.session.adminPin === 'Admin2023') {
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        res.redirect('home')
    } else {
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
    res.render('signup', {error:false, user: user})
})
// process signup form 
app.post('/signup', (req, res) => {
    const user = {
        name: req.body.fullname,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    }
    if (user.password === user.confirmPassword) {
        // check if user exists
        let sql = 'SELECT * FROM e_student WHERE email = ?'
        connection.query(
            sql, [user.email], (error, results) => {
                if (results.length > 0) {
                    let message = 'Account already exists with the email provided!'
                    res.render('signup', {error: true, message: message, user: user})
                }  else {
                    // create account
                    bcrypt.hash(user.password, 10, (error, hash) => {
                        let sql = 'INSERT INTO e_student (email, name, password, learn, profilePic) VALUES (?,?,?,?,?)'
                        connection.query(
                            sql,
                            [
                                user.email,
                                user.name,
                                hash,
                                0,
                                'user.png'
                            ],
                            (error, results) => {
                                res.redirect('/login')
                            }
                        )
                    })
                }
            }
        )
        
    } else {
        
        let message = 'Passwords dont match!'
        res.render('signup', {error:true, message: message, user: user})

    }
    
})
// Display Login Page
app.get('/login', (req, res) => {
    const user = {
        email : '',
        password : ''
    }
    res.render('login', {error:false, user: user})
})
// process login page
app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    let sql = 'SELECT * FROM e_student WHERE email = ?'
    connection.query(
        sql, [user.email], (error, results) => {
            if (results.length > 0) {
                bcrypt.compare(user.password, results[0].password, (error, passwordMatches) => {
                    if (passwordMatches) {
                        req.session.userID = results[0].id
                        req.session.username = results[0].name.split(' ')[0]
                        res.redirect('/home')
                    } else {
                        let message = 'Incorrect password!'
                        res.render('login', {error: true, message: message, user: user})
                    }
                })
            } else {
                let message = 'Account does not exist please create one'
                res.render('login', {error: true, message: message, user: user})
            }
        }
    )
})
// home
app.get('/home', (req, res) => {
    
    if (res.locals.isLogedIn && req.session.adminPin === 'Admin2023') {
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        res.render('home')
    } else {
        res.redirect('/login')
    }
})
// learn page
app.get('/learn', (req, res) => {
    if (res.locals.isLogedIn) {
        res.render('learn')
    } else {
        res.redirect('/login')
    }
})
// pdf view
app.get('/viewpdf/:resource', (req, res) => {
    let resource = req.params.resource
    // console.log(resource)
    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT learn FROM e_student WHERE id = ?', 
            [req.session.userID],
            (error, results) => {
                let newResult = results[0].learn
                newResult++
                connection.query(
                    'UPDATE e_student SET learn = ? WHERE id = ?;',
                    [newResult, req.session.userID],
                    (error, results) => {
                        connection.query(
                            'SELECT * FROM learningremarks WHERE resource = ?',
                            [resource],
                            (error, results) => {
                                res.render('pdf', {routes: results[0]})
                            }
                        )
                    }
                )
                
            }
        )
    } else {
        res.redirect('/login')
    }
})
// remark view 
app.get('/remark/:resource', (req, res) => {
    let resource = req.params.resource
    if (res.locals.isLogedIn) {
        
        res.render('remark', {resource: resource})
    } else {
        res.redirect('/login')
    }
})
app.post('/remark/:resource', (req, res) => {
    let resource = req.params.resource
    const userRemarks = {
        name: req.body.name,
        remark: req.body.remark
    }
    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT studentremarks FROM learningremarks WHERE resource = ?',
            [resource],
            (error, results) => {
                let newstudetremarks = results[0].studentremarks
                newstudetremarks++
                connection.query(
                    'UPDATE learningremarks SET studentremarks = ? WHERE resource = ?', 
                    [newstudetremarks, resource],
                    (error, results) => {
                        connection.query(
                            'INSERT INTO remarks_table (resource, name, remark) VALUES (?, ?, ?)',
                            [resource, userRemarks.name, userRemarks.remark],
                            (error, results) => {
                                res.redirect('/learn')
                            }
                        )
                    }
                )
            }
        )
    } else {
        res.redirect('/login')
    }
})
// progress view
app.get('/progress', (req, res) => {
    if (res.locals.isLogedIn) {
        let sql = 'SELECT * FROM e_student WHERE id = ?'
        connection.query(
            sql, [req.session.userID], (error, results) => {
                res.render('progres', {profile: results[0]})
            } 
        )
    } else {
        res.redirect('/login')
    }
})
// edit Profile view
app.get('/editMyProfile', (req, res) => {
    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT * FROM e_student WHERE id = ?', 
            [req.session.userID], 
            (error, results) =>{
                res.render('editProfile', {profile: results[0]})
            }
        )       
    } else {
        res.redirect('/login')
    }
})
app.post('/editProfile/:id', uploads.single('profilePic'), (req, res) => {
    // const e_student = {
    //     email: req.body.email,
    //     name: req.body.name,
    //     gender: req.body.gender,
    //     filename
    // }
    if (req.file) {
        connection.query(
            'UPDATE e_student SET email = ?, name = ?, gender = ?, profilePic = ? WHERE id = ? ',
            [
                req.body.email,            
                req.body.name,
                req.body.gender,
                req.file.filename,
                parseInt(req.params.id)
            ],
            (error, results) => {
                res.redirect('/progress')
            }
        )
    } else {
        connection.query(
            'UPDATE e_student SET email = ?, name = ?, gender = ?,  WHERE id = ? ',
            [
                req.body.email,            
                req.body.name,
                req.body.gender,
                parseInt(req.params.id)
            ],
            (error, results) => {
                res.redirect('/progress')
            }
        )
        
    }
    }
)

// Admin signup
app.get('/adminsignup', (req, res) => {
    const admin = {
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        pin: '',
    }
    res.render('adminsignup', {error:false, admin: admin} )
})
// process admin signup form
app.post('/adminsignup', (req, res) => {
    const admin = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        pin: req.body.adminPin
    }
    let adminAuthentificationPin = 'Admin2023'
    if (admin.pin === adminAuthentificationPin) {
        if (admin.password === admin.confirmPassword) {
            connection.query(
                'SELECT * FROM e_adminInfo WHERE email = ?',
                [admin.email],
                (error, results) => {
                    if (results.length > 0) {
                        let message = 'Sorry! You already have an account with that Email'
                        admin.email = ''
                        res.render('adminsignup', {error: true, message: message, admin: admin})
                    } else {
                        // create account
                        bcrypt.hash(admin.password, 10, (error, hash) => {
                            connection.query(
                                'INSERT INTO e_adminInfo (name, email, password) VALUES (?,?,?)',
                                [
                                    admin.name,
                                    admin.email,
                                    hash
                                ],
                                (error, results) => {
                                    res.redirect('/adminlogin')
                                }
                            )
                        })
                    }
                }
            )
        } else {
            let message = 'Passwords do not match!'
            admin.password = ''
            admin.confirmPassword = ''
            res.render('adminsignup', {error: true, message: message, admin: admin})
        }       
    } else {
        let message = 'Incorrect Admin pin'
        admin.pin = ''
        res.render('adminsignup', {error: true, message: message, admin: admin})
    }
})
// Admin login
app.get('/adminlogin', (req, res) => {
    const admin = {
        email : '',
        password : '',
        pin: ''
    }
    res.render('adminlogin', {error:false, admin: admin})
})
// Process admin login frm
app.post('/adminlogin', (req, res) => {
    const admin = {
        email : req.body.email,
        password : req.body.password,
        pin: req.body.pin
    }
    let adminAuthentificationPin = 'Admin2023'
    if (admin.pin === adminAuthentificationPin) {
        // Check if user exists
        connection.query(
            'SELECT * FROM e_admininfo WHERE email = ?',
            [admin.email],
            (error, results) => {
                if (results.length > 0) {
                    bcrypt.compare(admin.password, results[0].password, (error, passwordMatches) => {
                        if (passwordMatches) {
                            req.session.userID = results[0].adminID
                            req.session.username = results[0].name.split(' ')[0]
                            req.session.adminPin = adminAuthentificationPin
                            res.redirect('/adminhome')
                        } else {
                            let message = 'Incorrect password!'
                            admin.password = ''
                            res.render('adminlogin', {error: true, message: message, admin: admin})
                        }
                    })
                } else {
                    let message = 'You do not have an account with that email! Please create one'
                    res.render('adminlogin', {error: true, message: message, admin: admin})
                }
            }
        )    
    } else {
        let message = 'Wrong Admin Pin'
        admin.pin = 'Admin2023'    //remember to remove this..............................................................
        res.render('adminlogin', {error: true, message: message, admin: admin})
    }
})
// Render admin home page
app.get('/adminhome', (req, res) => {
    if (req.session.adminPin === 'Admin2023') {
        res.render('adminhome')
    } else {
        res.redirect('/adminlogin')
    }
})
// Render viewStudent
app.get('/viewstudent', (req, res) => {
    if (req.session.adminPin === 'Admin2023') {
        connection.query(
            'SELECT name, email, learn, gender, profilePic FROM e_student',
            [],
            (error, results) => {
                res.render('viewstudent', {results: results})
            }
        )
    } else {
        res.redirect('/adminlogin')
    }
})
// Render viewresource
app.get('/viewresource', (req, res) => {
    if (req.session.adminPin === 'Admin2023') {
        res.render('viewresource')
    } else {
        res.redirect('/adminlogin')
    }
})
// Render viewremarks
app.get('/viewremark', (req, res) => {
    if (req.session.adminPin === 'Admin2023') {
        res.render('viewremark')
    } else {
        res.redirect('/adminlogin')
    }
})


// logout functionality
app.get('/logout', (req, res) => {
    // kill the logged in session
    req.session.destroy(() =>{
        res.redirect('/')
    })
})
const PORT = process.env.PORT || 3550
app.listen(PORT, () => {
    console.log(`app is live on PORT ${PORT}`)
})