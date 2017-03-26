from flask_wtf import Form
from flask import flash
from wtforms import StringField, PasswordField, BooleanField, SubmitField, ValidationError
from wtforms.validators import DataRequired, Email, Length, Regexp, EqualTo
from ..models import User

class LoginForm(Form):
    email = StringField('Email', validators=[DataRequired(),
                                             Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Keep me logged in')
    submit = SubmitField('Log in')

class RegistrationForm(Form):
    email = StringField('Email', validators=[DataRequired(),
                                             Length(6,64),
                                             Email()])
    username = StringField('Username', validators=[DataRequired(),
                                                   Length(4,32),
                                                   Regexp('^[A-Za-z][A-Za-z0-9_.]+$',0,
                                                          'Usernames must contain only letters, ' +
                                                          'numbers underscores and periods')])
    password = PasswordField('Password', validators=[DataRequired(),
                                                     Length(8,16)],)
    password2 = PasswordField('Confirm Password', validators=[DataRequired(),
                                                              EqualTo('password',
                                                                      message='Passwords must match')])
    submit = SubmitField('Register')

    def validate_email(self, field):
        if User.query.filter_by(email=field.data).first():
            raise ValidationError('Email address already registered')

    def validate_username(self, field):
        if User.query.filter_by(username=field.data).first():
            raise ValidationError('That username is unavailable')