require('dotenv').config({path: './.env'})
const config = require('./config/config')

const express = require('express')
const cors = require('cors')
const app = express()
const bcrypt = require('bcrypt-nodejs')
const knex = require('knex')

const defaultUserInfo = ['id', 'username', 'email', 'rank', 'created_at', 'updated_at']

// Middlewares
app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use(cors())

const db = knex(config('db'))

app.get('/', (req, res) => {
    return db('users').select(defaultUserInfo)
    .then(users => res.json(users))
    .catch(e => console.log(e))
})

app.post('/signin', (req, res) => {
    const { email, password } = req.body

    return db('login')
        .select('email', 'password')
        .where({email})
        .then(user => {
            if(bcrypt.compareSync(password, user[0].password)){
                return db('users')
                .select(defaultUserInfo)
                .where({
                    email: user[0].email,
                })
                .then(data => res.json(data[0]))
                // eslint-disable-next-line no-unused-vars
                .catch(e => res.status(400).json('Unable to get user!'))
            }
        })
        // eslint-disable-next-line no-unused-vars
        .catch(e => res.status(400).json('User info are wrong'))
})

app.post('/register', (req, res) => {
    const { username, email, password} = req.body
    const now = new Date()
    const hash = bcrypt.hashSync(password)

    return db.transaction(trx => {
        return Promise.all([
            trx('users').insert({
                username,
                email,
                rank: 0,
                created_at: now,
                updated_at: now,
            })
            .returning(defaultUserInfo),
            trx('login').insert({
                email,
                password: hash,
            }),
        ])
        .then(user => res.json(user[0]))
        .then(trx.commit)
        .catch(trx.rollback)
    })
    // eslint-disable-next-line no-unused-vars
    .catch(e => res.status(400).json('Registration failed. A user with this email already exists.'))
})

app.get('/profile/:id', (req, res) => {
    const id = parseInt(req.params.id)
    
    return db('users')
        .select(defaultUserInfo)
        .where({id})
        .then(user => {
            if(user.length){
                return res.json(user[0])
            }

            return res.status(404).json('User not found!')
        })
        // eslint-disable-next-line no-unused-vars
        .catch(e => res.status(400).json('Error getting user info. Try again later!'))
})

app.put('/image', (req, res) => {
    const id = parseInt(req.body.id)
    
    return db('users')
        .where({id})
        .increment('rank', 1)
        .returning('rank')
        .then(rank => res.json({rank:rank[0]}))
        // eslint-disable-next-line no-unused-vars
        .catch(e => res.status(404).json('Unable to get the rank. User not found.'))
})

app.listen(config('app').port)
