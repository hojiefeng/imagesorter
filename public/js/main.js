$(document).ready(function(){
    $('#image').on('change', function(){
        $('#imagepreview').attr('src', window.URL.createObjectURL(this.files[0]))

    })

    $('#deleteimage').on('click', function(){
        var id = $(this).attr('data-id');
        $.ajax({
            url: '/images/' + id,
            type: 'DELETE',
            success: function(result) {
                result = JSON.parse(result);
                alert(result.message);
                if(result.hasOwnProperty('success'))
                {
                    window.location.replace("/");
                }
            }
        });
    })
    

    $('#editimage').data('clicked', false);
    $('#editimage').on('click', function(){
        if($(this).data('clicked') == false)
        {
            $('.editable').each(function(e){
               var text = $(this).text();
               var id = $(this).attr('id');
               $(this).html('<input type="text" name="' + id + '" class="form-control" value="' + text + '">');
            })
            $(this).text('Save Changes');
            $('#editimage').data('clicked', true);
        }
        else
        {
            var edited = {};
            var id = $(this).attr('data-id');
            $('.editable input').each(function(){
                var value = $(this).val();
                var key = $(this).parent().attr('id');
                edited[key] = value;
            });
            $.ajax({
                url: '/images/' + id,
                type: 'PUT',
                data: edited,
                success: function(result) {
                    result = JSON.parse(result);
                    alert(result.message);
                    if(result.hasOwnProperty('success'))
                    {
                        window.location.reload();
                    }
                }
            });
        }
    });
})
