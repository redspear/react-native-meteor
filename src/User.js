import { AsyncStorage } from 'react-native';
import SHA256 from 'crypto-js/sha256';

import Data from './Data';

const TOKEN_KEY = 'reactnativemeteor_usertoken';

const hashPassword = (password) => {
  return {
    digest: SHA256(password).toString(),
    algorithm: "sha-256"
  }
}

module.exports = {
  user() {
    return this.collection('users').findOne(this._userIdSaved);
  },
  userId() {
    const user = this.collection('users').findOne(this._userIdSaved);
    return user && user._id;
  },
  _isLoggingIn: true,
  loggingIn() {
    return this._isLoggingIn;
  },
  logout(callback) {
    this.call("logout", function(err) {
      AsyncStorage.removeItem(TOKEN_KEY);
      typeof callback == 'function' && callback(err);
    });
  },
  loginWithPassword(selector, password, callback) {
    if (typeof selector === 'string') {
      if (selector.indexOf('@') === -1)
        selector = {username: selector};
      else
        selector = {email: selector};
    }

    this._startLoggingIn();
    this.call("login", {
        user: selector,
        password: hashPassword(password)
    }, (err, result)=>{
      this._endLoggingIn();

      this._handleLoginCallback(err, result);

      typeof callback == 'function' && callback(err);
    });
  },
  createUser(options, callback) {
    if (options.username) options.username = options.username;
    if (options.email) options.email = options.email;

    // Replace password with the hashed password.
    options.password = hashPassword(options.password);

    this._startLoggingIn();
    this.call("createUser", options, (err, result)=>{
      this._endLoggingIn();

      this._handleLoginCallback(err, result);

      if(typeof callback == 'function') {
        callback(err)
      }
    });
  },
  _startLoggingIn() {
    this._isLoggingIn = true;
    Data._notifyLoggingIn();
  },
  _endLoggingIn() {
    this._isLoggingIn = false;
    Data._notifyLoggingIn();
  },
  _handleLoginCallback(err, result) {
    if(!err) {//save user id and token
      AsyncStorage.setItem(TOKEN_KEY, result.token);
      this._userIdSaved = result.id;
    }
  },
  async _loadInitialUser() {
    try {
      var value = await AsyncStorage.getItem(TOKEN_KEY);
      if (value !== null){
        this._startLoggingIn();
        this.call('login', { resume: value }, (err, result) => {
          this._endLoggingIn();
          this._handleLoginCallback(err, result);
        });
      } else {
        this._endLoggingIn();
      }
    } catch (error) {
      this._appendMessage('AsyncStorage error: ' + error.message);
    }
  }
}
