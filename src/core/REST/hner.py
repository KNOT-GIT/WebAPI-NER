'''
Created on 28. 10. 2013

@author: casey
'''

import cherrypy


from ner import recognize
import os
import json
from core.adapters import *


class NERHandler():
    '''
    classdocs
    '''

    exposed = True
    def __init__(self, core):
        '''
        Constructor
        '''
        self.core = core
        self.kb_manager = core.getManager("kb")
        self.proc_manager = core.getManager("proc")
        
    @cherrypy.tools.json_out()
    def GET(self, *flags, **kw):
        kblist = self.kb_manager.getStatus()
        result = []
        for kb in kblist:
            if kb["processor"] == "ner":
                result.append({"name":kb["name"],
                           "status": 0 if kb["status"] < 3 else 1
                           })
        return result
    
    
    @cherrypy.tools.json_out()
    def POST(self, *flags, **kw):
        txt = kw.get("text")
        kb_name = flags[0] if len(flags) > 0 else None
        error_msg = []
        if txt is None:
            error_msg.append("No input text specified or wrong parameter. Use ?text=")
        if kb_name is None:
            error_msg.append("No Knowledge Base specified!")
        if len(flags) > 0:
            kb = self.kb_manager.getKB(flags[0])
            if kb is None:
                error_msg.append("Cant find Knowledge base: " + flags[0])
            elif kb.status < 4:
                error_msg.append("Knowledge base is not loaded! - : " + flags[0])
            else:
                return self.proc_manager.recognize(txt.encode("utf-8"), kb, None)
            #result = recognize(kb, txt.encode("utf-8"), False, False)
            #rg =  parse_result(result, kb, 'classic')
        return {"header":{"status":1,
                            "msg":error_msg  },
                }
        
    
    def PUT(self):
        pass
        
    
    def DELETE(self):
        pass

        
        