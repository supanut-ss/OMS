using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BS_Notify_Worker.Models
{
    public class NotificationItem
    {
        public int id { get; set; }
        public string type { get; set; }
        public string title { get; set; }
        public string? description { get; set; }
        public string? link { get; set; }
        public string to_user { get; set; }
        public string from_user { get; set; }
    }
}
