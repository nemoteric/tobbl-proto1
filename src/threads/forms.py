from flask_wtf import Form
from wtforms import StringField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Length

class NewThread(Form):
    prompt = StringField('Question', validators=[DataRequired(), Length(10, 120)])
    choice1 = StringField('First choice', validators=[Length(1,60)])
    choice2 = StringField('Second choice', validators=[Length(1,60)])
    choice3 = StringField('Third choice', validators=[Length(1,60)])
    morechoices = BooleanField('Can users suggest more choices?', default=True)
    submit = SubmitField('Continue')

class DeleteForm(Form):
    delete = SubmitField('Delete')
    cancel = SubmitField('Cancel')