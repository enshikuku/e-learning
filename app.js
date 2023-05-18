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
    
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        res.redirect('home')
    } else {
        res.render('signup', {error:false, user: user})
    }  
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
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        res.redirect('home')
    } else {
        res.render('login', {error:false, user: user})
    }
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
                        req.session.userID = results[0].s_id
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
    
    if (res.locals.isLogedIn && res.locals.sessionpin) {
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
        connection.query(
            'SELECT * FROM learningresources',
            [],
            (error, results) => {
                res.render('learn', {results: results})
            }
        )
    } else {
        res.redirect('/login')
    }
})

// pdf view
app.get('/viewpdf/:lr_id', (req, res) => {
    let lr_id = req.params.lr_id
    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT learn FROM e_student WHERE s_id = ?', 
            [req.session.userID],
            (error, results) => {
                let newResult = results[0].learn
                newResult++
                connection.query(
                    'UPDATE e_student SET learn = ? WHERE s_id = ?',
                    [newResult, req.session.userID],
                    (error, results) => {
                        connection.query(
                            'SELECT * FROM learningresources WHERE lr_id = ?',
                            [lr_id],
                            (error, results) => {
                                let newopened = results[0].opened
                                newopened++
                                connection.query(
                                    'UPDATE learningresources SET opened = ? WHERE lr_id = ?',
                                    [newopened, lr_id],
                                    (error, results) => {
                                        connection.query(
                                            'SELECT * FROM learningresources WHERE lr_id = ?',
                                            [lr_id],
                                            (error, results) => {
                                                res.render('pdf', {routes: results[0]})
                                            }
                                        )
                                    }
                                )
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
app.get('/remark/:lr_id', (req, res) => {
    let lr_id = req.params.lr_id
    let studentID = req.session.userID
    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT rsctitle FROM learningresources WHERE lr_id = ?',
            [lr_id],
            (error, results) => {
                res.render('remark', {lr_id: lr_id, studentID: studentID, results: results[0]})
            }
        )
    } else {
        res.redirect('/login')
    }
})

app.post('/remark/:lr_id/:studentID', (req, res) => {
    let lr_id = req.params.lr_id
    let studentID = req.params.studentID
    const userRemarks = {
        remark: req.body.remark
    }
    if (res.locals.isLogedIn) {
        connection.query(
            'SELECT totalremarks FROM learningresources WHERE lr_id = ?',
            [lr_id],
            (error, results) => {
                let newtotalremarks = results[0].totalremarks
                newtotalremarks++
                connection.query(
                    'UPDATE learningresources SET totalremarks = ? WHERE lr_id = ?', 
                    [newtotalremarks, lr_id],
                    (error, results) => {
                        connection.query(
                            'INSERT INTO remarks_table (lr_id, s_id, remark) VALUES (?, ?, ?)',
                            [lr_id, studentID, userRemarks.remark],
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
        let sql = 'SELECT * FROM e_student WHERE s_id = ?'
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
            'SELECT * FROM e_student WHERE s_id = ?', 
            [req.session.userID], 
            (error, results) =>{
                res.render('editProfile', {profile: results[0]})
            }
        )       
    } else {
        res.redirect('/login')
    }
})

app.post('/editProfile/:s_id', upload1.single('profilePic'), (req, res) => {
    if (req.file) {
        connection.query(
            'UPDATE e_student SET email = ?, name = ?, gender = ?, profilePic = ? WHERE s_id = ? ',
            [
                req.body.email,            
                req.body.name,
                req.body.gender,
                req.file.filename,
                parseInt(req.params.s_id)
            ],
            (error, results) => {
                res.redirect('/progress')
            }
        )
    } else {
        connection.query(
            'UPDATE e_student SET email = ?, name = ?, gender = ?  WHERE s_id = ? ',
            [
                req.body.email,            
                req.body.name,
                req.body.gender,
                parseInt(req.params.s_id)
            ],
            (error, results) => {
                if (error) {
                    res.render('pagenotfound')
                } else {
                    res.redirect('/progress')
                }
                
            }
        )
        
    }
    }
)

// render chatroom 
app.get('/chatroom', (req, res) => {
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT chatroom.*, e_student.name AS student_name, e_admininfo.name AS admin_name FROM chatroom LEFT JOIN e_student ON chatroom.s_id = e_student.s_id LEFT JOIN e_admininfo ON chatroom.a_id = e_admininfo.a_id',
            [],
            (error, results) => {
                let senderID = req.session.userID
                res.render('chatroom', {results: results, admin: true,senderID: senderID})
            }
        )
    } else if (res.locals.isLogedIn) {
        connection.query(
            'SELECT chatroom.*, e_student.name AS student_name, e_admininfo.name AS admin_name FROM chatroom LEFT JOIN e_student ON chatroom.s_id = e_student.s_id LEFT JOIN e_admininfo ON chatroom.a_id = e_admininfo.a_id',
            [],
            (error, results) => {
                let senderID = req.session.userID
                res.render('chatroom', {results: results, admin: false,senderID: senderID})
            }
        )
    } else {
        res.redirect('/login')
    }
})

// Send message in chatroom
app.post('/sendmessage', (req, res) => {
    const chatInfo = {
        id : req.body.id,            
        message : req.body.message
    }
    if (res.locals.sessionpin) {
        connection.query(
            'INSERT INTO chatroom (a_id, tutor, chat) VALUES (?, ?, ?)',
            [
                chatInfo.id,
                'true',
                chatInfo.message
            ],
            (error, results) => {
                res.redirect('/chatroom')
            }
        )
    } else if (res.locals.isLogedIn) {
        connection.query(
            'INSERT INTO chatroom (s_id, tutor, chat) VALUES (?, ?, ?)',
            [
                chatInfo.id,
                'false',
                chatInfo.message
            ],
            (error, results) => {
                res.redirect('/chatroom')
            }
        )
    } else {
        res.redirect('/login')
    }
})

// Clear Messages
app.post('/clearchats', (req, res) => {
    connection.query(
        'DELETE FROM chatroom WHERE c_id > ?',
        [0],
        (error, results) => {
            res.redirect('/chatroom')
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
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        res.redirect('home')
    } else {
        res.render('adminsignup', {error:false, admin: admin} )
    }
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
    if (admin.pin === adminAuthenticationPin) {
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
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        res.redirect('/adminhome')
    } else if (res.locals.isLogedIn) {
        res.redirect('home')
    } else {
        res.render('adminlogin', {error:false, admin: admin})
    }
})

// Process admin login form
app.post('/adminlogin', (req, res) => {
    const admin = {
        email : req.body.email,
        password : req.body.password,
        pin: req.body.pin
    }
    if (admin.pin === adminAuthenticationPin) {
        // Check if user exists
        connection.query(
            'SELECT * FROM e_admininfo WHERE email = ?',
            [admin.email],
            (error, results) => {
                if (results.length > 0) {
                    bcrypt.compare(admin.password, results[0].password, (error, passwordMatches) => {
                        if (passwordMatches) {
                            req.session.userID = results[0].a_id
                            req.session.username = results[0].name.split(' ')[0]
                            req.session.adminPin = adminAuthenticationPin
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
        let message = 'Incorrect Admin pin'
        res.render('adminlogin', {error: true, message: message, admin: admin})
    }
})

// Render admin home page
app.get('/adminhome', (req, res) => {
    if (res.locals.sessionpin) {
        res.render('adminhome')
    } else {
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
                res.render('viewstudent', {results: results})
            }
        )
    } else {
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
                res.render('viewresource', {results: results})
            }
        )
    } else {
        res.redirect('/adminlogin')
    }
})

// Render addresource
app.get('/addresource', (req, res) => {
    const resourceInfo = {
        title : req.body.rsctitle,            
        definition : req.body.learndefinition,
        resource : req.body.resource
    }
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT * FROM learningresources',
            [],
            (error, results) => {
                res.render('addresource', {error:false, results: results, resourceInfo: resourceInfo})
            }
        )
    } else {
        res.redirect('/adminlogin')
    }
})

// Adding resource
app.post('/addresource', upload2.single('route'), (req, res) => {
    const resourceInfo = {
        title : req.body.rsctitle,            
        definition : req.body.learndefinition,
        resource : req.body.resource,
        filename : req.file.originalname,
    } 
    connection.query(
        'SELECT rsctitle FROM learningresources WHERE rsctitle = ?',
        [resourceInfo.title],
        (error, results) => {
            console.log(error)
            if(results.length > 0){
                let message = 'There is already a resource with the title! Please rename!'
                resourceInfo.title = ''
                res.render('addresource', {error: true, message: message, resourceInfo: resourceInfo})
            }else{
                connection.query(
                    'SELECT resource FROM learningresources WHERE resource = ?',
                    [resourceInfo.resource],
                    (error, results) => {
                        console.log(error)
                        if(results.length > 0){
                            let message = 'Resource code already exists! Please change the resouce code'
                            resourceInfo.resource = ''
                            res.render('addresource', {error: true, message: message, resourceInfo: resourceInfo})
                        }else{
                            connection.query(
                                'SELECT route FROM learningresources WHERE route = ?',
                                [resourceInfo.route],
                                (error, results) => {
                                    console.log(error)
                                    if(results.length > 0){
                                        let message = 'File name already exists! Please rename the file before uploading.'
                                        resourceInfo.filename = ''
                                        res.render('addresource', {error: true, message: message, resourceInfo: resourceInfo})
                                    }else{
                                        connection.query(
                                            'INSERT INTO learningresources (rsctitle, learndefinition, resource, route, a_id) VALUES (?, ?, ?, ?, ?)',
                                            [
                                                resourceInfo.title,            
                                                resourceInfo.definition,
                                                resourceInfo.resource,
                                                resourceInfo.filename,
                                                req.session.userID
                                            ],
                                            (error, results) => {
                                                console.log(error)
                                                res.redirect('/viewresource')
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
})

// edit resource
app.get('/editresource/:lr_id', (req, res) => {
    let lr_id = req.params.lr_id
    if (res.locals.sessionpin) {
        connection.query(
            'SELECT * FROM learningresources WHERE lr_id = ?',
            [lr_id],
            (error, results) => {
                res.render('editresource', {results: results[0], error: false})
            }
        )
    } else {
        res.redirect('/adminlogin')
    }
})

// editting the resource
app.post('/editresource/:lr_id', upload2.single('route'), (req, res) => {
    let lr_id = req.params.lr_id
    const resourceInfo = {
        title : req.body.rsctitle,            
        definition : req.body.learndefinition
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
                res.redirect('/viewresource')
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
                res.redirect('/viewresource')
            }
        )
        
    }
})

// delete resource
app.post('/delete/:lr_id', (req, res) => {
    connection.query (
        'SELECT * FROM learningresources WHERE lr_id = ?', 
        [req.params.lr_id],
        (error, results) => {
            fs.unlink(`./public/pdfuploads/${results[0].route}`, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
                connection.query(
                    'DELETE FROM learningresources WHERE lr_id = ?',
                    [req.params.lr_id],
                    (error, results) => {
                        res.redirect('/viewresource')
                    }
                )
            })
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
                res.render('viewremark', {results: results})
            }
        )
    } else {
        res.redirect('/adminlogin')
    }
})

// Handle remark
app.post('/handle/:r_id', (req, res) => {
    connection.query (
        'DELETE FROM remarks_table WHERE r_id = ?',
        [req.params.r_id],
        (error, results) => {
            res.redirect('/viewremark')
        }
    )
})

// render superadmin
app.get('/superadminlogin', (req, res) => {
    const superadmin = {
        pin: ''
    }
    if (res.locals.isLogedIn && res.locals.sessionpin) {
        res.render('superadminlogin', {error:false, superadmin: superadmin})
    } else if (res.locals.isLogedIn) {
        res.redirect('home')
    } else {
        res.redirect('/adminlogin')
    }
})

app.post('/superadminlogin', (req, res) => {
    const superadmin = {
        superadminpin: req.body.superadminpin
    }
    if (superadmin.superadminpin === superAdminAuthPin) {
        req.session.superadminPin = adminAuthenticationPin
        res.redirect('/manager')
    } else {
        let message = 'Wrong Superadmin Pin'
        res.render('superadminlogin', {error: true, message: message, superadmin: superadmin})
    }
})

app.get('/manager', (req, res) => {
    if (res.locals.isLogedIn && res.locals.sessionpin && res.locals.superadminsession) {
        res.render('manager')
    } else if (res.locals.isLogedIn) {
        res.redirect('/home')
    } else {
        res.redirect('/adminlogin')
    }
})

app.get('/studentmanager', (req, res) => {
    if (res.locals.isLogedIn && res.locals.sessionpin && res.locals.superadminsession) {
        connection.query(
            'SELECT * FROM e_student',
            [],
            (error, results) => {
                res.render('studentmanager', {results: results})
            }
        )
    } else if (res.locals.isLogedIn) {
        res.redirect('/home')
    } else {
        res.redirect('/adminlogin')
    }
})

// delete student
app.post('/deletestudent/:s_id', (req, res) => {
    connection.query (
        'DELETE FROM e_student WHERE s_id = ?',
        [req.params.s_id],
        (error, results) => {
            res.redirect('/studentmanager')
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

// delete admin
app.post('/deleteadmin/:a_id', (req, res) => {
    connection.query (
        'DELETE FROM e_admininfo WHERE a_id = ?',
        [req.params.a_id],
        (error, results) => {
            res.redirect('/adminmanager')
        }
    )
})

app.get('/terms', (req, res) => {
    res.render('terms')
})

app.get('/privacy', (req, res) => {
    res.render('privacy')
})

app.get('/codeofconduct', (req, res) => {
    res.render('codeofconduct')
})

// logout functionality
app.get('/logout', (req, res) => {
    req.session.destroy(() =>{
        res.redirect('/')
    })
})

app.get('*', (req, res) => {
    res.render('pagenotfound')
})

const PORT = process.env.PORT || 3049
app.listen(PORT, () => {
    console.log(`app is live on PORT ${PORT}`)
})
