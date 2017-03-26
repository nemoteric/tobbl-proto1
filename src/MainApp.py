from flask import Flask, render_template, request, redirect, session

mainapp = Flask(__name__)
from app import views


@mainapp.route('/',methods=['GET'])
def main():
  return render_template("helloworld.html")

if __name__ == '__main__':
  #Run Server on port 5000
  mainapp.run(host='0.0.0.0')
