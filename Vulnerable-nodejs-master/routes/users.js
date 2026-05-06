var express = require('express');
var router = express.Router();

const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// -------------------------------admin support-------------------------------

/* GET userlist. */
router.get('/userlist', function (req, res) {
  var db = req.db;
  var collection = db.get('userlist');
  collection.find({}, {}, function (e, docs) {
    res.json(docs);
  });
});

/* POST to adduser. */
router.post('/adduser', async function (req, res) {
  var db = req.db;
  var collection = db.get('userlist');

  const username = req.body.username;
  const password = req.body.password;

  // Validate username as email
  if (!validator.isEmail(username)) {
    return res.status(400).send({ msg: "Invalid email" });
  }

  // Check duplicate user
  var user = await collection.findOne({ username: username });
  if (user) {
    return res.send({ msg: "duplicate username" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  req.body.password = hashedPassword;

  collection.insert(req.body, function (err, result) {
    res.send(
      (err === null) ? { msg: '' } : { msg: err }
    );
  });
});

/* DELETE to deleteuser. */
router.delete('/deleteuser/:id', function (req, res) {
  var db = req.db;
  var collection = db.get('userlist');
  var userToDelete = req.params.id;
  collection.remove({ '_id': userToDelete }, function (err) {
    res.send((err === null) ? { msg: '' } : { msg: 'error: ' + err });
  });
});

// -------------------------------user support-------------------------------

/* authenticate and login user */
router.post('/session', async function (req, res) {

  // If session already exists
  if (req.session.user) {
    return res.send({ user: req.session.user });
  }

  // Empty field check
  if (req.body.username === '' || req.body.password === '') {
    return res.send({ msg: "Please fill in all fields" });
  }

  var db = req.db;
  var collection = db.get('userlist');

  // Find user by username only
  var user = await collection.findOne({
    username: req.body.username
  });

  // If user not found
  if (!user) {
    return res.send({ msg: "unauthorized" });
  }

  // Compare entered password with hashed password
  const validPassword = await bcrypt.compare(
    req.body.password,
    user.password
  );

  if (!validPassword) {
    return res.send({ msg: "unauthorized" });
  }

  // Successful login
  try {
    req.session.regenerate(() => {

      req.session.user = user;

      // Create JWT token
      const token = jwt.sign(
        { id: user._id },
        'your-secret-key',
        { expiresIn: '1h' }
      );

      res.status(200).send({
        username: user.username,
        token: token
      });

    });
  } catch (err) {
    console.log(err);
    res.send({ msg: "login error" });
  }

});

/* delete a user's session */
router.delete('/session', (req, res) => {
  if (req.session.user) {
    console.log(
      `Session.login destroy: ${req.session.user.username}`
    );
    req.session.destroy(() => {
      res.status(204).end();
    });
  }
});

/* get info of the current user in session */
router.get('/', (req, res) => {
  if (req.session.user) {
    res.status(200).send({ user: req.session.user }).end();
  } else {
    res.send({ msg: "Something bad happens" });
  }
});

/* modify the login user's data */
router.put('/modify', async function (req, res) {
  // check is login
  if (!req.session.user) {
    res.send({ msg: "login first" }).end();
  } else {
    var db = req.db;
    var collection = db.get('userlist');
    var query = req.body;

    // Validate email if provided
   if (query.email && !validator.isEmail(query.email)) {
       return res.status(400).send({ msg: "Invalid email" });
      }
    // update the corresponding fields
    collection.findOneAndUpdate({ 'username': req.session.user.username }, { $set: query }, function (err, result) {
      // update session too
      if (result) {
        req.session.user = result;
      }
      res.send(
        (err === null) ? { msg: '' } : { msg: err }
      );
    });
  }
});

module.exports = router;
