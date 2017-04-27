import httplib

# Tobbl

# authors are Samuel Haaf, Anshika Srivastava, April Wang etc...

# use this server for prod, once it's on ec2
SERVER = 'ec2-54-245-138-51.us-west-2.compute.amazonaws.com:5000'


def get_resource(keyword):

    out = dict()
    h = httplib.HTTPConnection(SERVER)
    
    # Suggested keywords for now - oceans,Facebook,network,social, economic,clean,suicide,mother,underrated,visa,years
    h.request('GET', '/api'+'?keyword='+keyword)
    resp = h.getresponse()
    out = resp.read()
    return out


if __name__ == '__main__':
    print "************************************************"
    print "test of my flask app running at ", SERVER
    print "created by Samuel Haaf, Anshika Srivastava, April Wang"
    print "************************************************"
    print " "
    print "******** resource **********"
    print get_resource('oceans')
